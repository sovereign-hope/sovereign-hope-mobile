import {
  OfflineAudioContext,
  AudioContext,
  AudioBuffer,
} from "react-native-audio-api";
import { Asset } from "expo-asset";
import type { AmbientSound } from "src/services/ambientAudioService";
import {
  AMBIENT_VOLUME,
  ENCODING_PLAYS,
  FINAL_OUTRO_FADE_MS,
  MAX_SESSION_DURATION_SECONDS,
  SPOKEN_PLAYBACK_VOLUME,
  getEncodingGapDuration,
  getEstimatedMemoryAudioSessionDurationSeconds,
  getFinalOutroDuration,
  getRecallGapDuration,
  getSpokenMixVolume,
} from "src/services/memoryAudioConstants";
import type { MemoryAudioSessionPhase } from "src/services/memoryAudioConstants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PhaseTimelineEntry = {
  startSeconds: number;
  endSeconds: number;
  phase: MemoryAudioSessionPhase;
  gapDurationMs?: number;
  encodingPlaysCompleted: number;
  recallCyclesCompleted: number;
};

export type RenderedSession = {
  buffer: AudioBuffer;
  durationSeconds: number;
  verseDurationSeconds: number;
  phaseTimeline: PhaseTimelineEntry[];
};

// ---------------------------------------------------------------------------
// LRU decode cache (max 3 entries per cache)
// ---------------------------------------------------------------------------

const MAX_CACHE_SIZE = 3;

type CacheEntry<T> = { key: string; value: T };

const makeCache = <T>() => {
  const entries: CacheEntry<T>[] = [];

  const get = (key: string): T | undefined => {
    const index = entries.findIndex((entry) => entry.key === key);
    if (index < 0) return undefined;
    // Move to end (most recently used)
    const [entry] = entries.splice(index, 1);
    entries.push(entry);
    return entry.value;
  };

  const set = (key: string, value: T): void => {
    const index = entries.findIndex((entry) => entry.key === key);
    if (index >= 0) {
      entries.splice(index, 1);
    }
    if (entries.length >= MAX_CACHE_SIZE) {
      entries.shift();
    }
    entries.push({ key, value });
  };

  const clear = (): void => {
    entries.length = 0;
  };

  return { get, set, clear };
};

const verseBufferCache = makeCache<ArrayBuffer>();
const ambientBufferCache = makeCache<ArrayBuffer>();

export const clearDecodedBufferCache = (): void => {
  verseBufferCache.clear();
  ambientBufferCache.clear();
};

// ---------------------------------------------------------------------------
// Asset loading helpers
// ---------------------------------------------------------------------------

const fetchVerseArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
  const cached = verseBufferCache.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  verseBufferCache.set(url, arrayBuffer);
  return arrayBuffer;
};

const fetchAmbientArrayBuffer = async (
  moduleId: number
): Promise<ArrayBuffer> => {
  const cacheKey = String(moduleId);
  const cached = ambientBufferCache.get(cacheKey);
  if (cached) return cached;

  const asset = await Asset.fromModule(moduleId).downloadAsync();
  if (!asset.localUri) {
    throw new Error("Failed to download ambient audio asset");
  }

  const response = await fetch(asset.localUri);
  const arrayBuffer = await response.arrayBuffer();
  ambientBufferCache.set(cacheKey, arrayBuffer);
  return arrayBuffer;
};

// ---------------------------------------------------------------------------
// Timeline computation
// ---------------------------------------------------------------------------

const FALLBACK_SAMPLE_RATE = 44_100;

/**
 * Query the device's native audio sample rate. On iOS this is typically 48000,
 * on Android it varies. Using the native rate avoids resampling artifacts —
 * if we render at 44100 but the live AudioContext plays at 48000, the audio
 * will be ~8.8% faster because react-native-audio-api may not resample.
 */
const getDeviceSampleRate = async (): Promise<number> => {
  try {
    const tempCtx = new AudioContext();
    const rate = tempCtx.sampleRate;
    await tempCtx.close();
    return rate > 0 ? rate : FALLBACK_SAMPLE_RATE;
  } catch {
    return FALLBACK_SAMPLE_RATE;
  }
};

const computeTimeline = (
  verseDurationSeconds: number,
  recallCyclesTarget: number
): PhaseTimelineEntry[] => {
  const timeline: PhaseTimelineEntry[] = [];
  let cursor = 0;
  let encodingPlaysCompleted = 0;
  let recallCyclesCompleted = 0;

  // Encoding phase: ENCODING_PLAYS repetitions with gaps between them
  for (let i = 0; i < ENCODING_PLAYS; i += 1) {
    timeline.push({
      startSeconds: cursor,
      endSeconds: cursor + verseDurationSeconds,
      phase: "encoding_playing",
      encodingPlaysCompleted,
      recallCyclesCompleted,
    });
    cursor += verseDurationSeconds;
    encodingPlaysCompleted += 1;

    // Gap after each encoding play except the last encoding play
    // (transition from encoding to recall is immediate)
    if (i < ENCODING_PLAYS - 1) {
      const gapMs = getEncodingGapDuration(verseDurationSeconds);
      const gapSeconds = gapMs / 1000;
      timeline.push({
        startSeconds: cursor,
        endSeconds: cursor + gapSeconds,
        phase: "encoding_gap",
        gapDurationMs: gapMs,
        encodingPlaysCompleted,
        recallCyclesCompleted,
      });
      cursor += gapSeconds;
    }
  }

  // Recall phase: recallCyclesTarget repetitions with growing gaps
  for (let i = 0; i < recallCyclesTarget; i += 1) {
    timeline.push({
      startSeconds: cursor,
      endSeconds: cursor + verseDurationSeconds,
      phase: "recall_playing",
      encodingPlaysCompleted,
      recallCyclesCompleted,
    });
    cursor += verseDurationSeconds;
    recallCyclesCompleted += 1;

    if (i < recallCyclesTarget - 1) {
      // Inter-recall gap (growing intervals)
      const gapMs = getRecallGapDuration(i, verseDurationSeconds);
      const gapSeconds = gapMs / 1000;
      timeline.push({
        startSeconds: cursor,
        endSeconds: cursor + gapSeconds,
        phase: "recall_gap",
        gapDurationMs: gapMs,
        encodingPlaysCompleted,
        recallCyclesCompleted,
      });
      cursor += gapSeconds;
    } else {
      // Final outro gap after the last recall play
      const outroDurationMs = getFinalOutroDuration(verseDurationSeconds);
      const outroSeconds = outroDurationMs / 1000;
      timeline.push({
        startSeconds: cursor,
        endSeconds: cursor + outroSeconds,
        phase: "recall_gap",
        gapDurationMs: outroDurationMs,
        encodingPlaysCompleted,
        recallCyclesCompleted,
      });
      cursor += outroSeconds;
    }
  }

  return timeline;
};

const clampRecallCycles = (
  verseDurationSeconds: number,
  recallCyclesTarget: number
): number => {
  let cycles = recallCyclesTarget;
  while (
    cycles > 1 &&
    getEstimatedMemoryAudioSessionDurationSeconds(
      verseDurationSeconds,
      cycles
    ) > MAX_SESSION_DURATION_SECONDS
  ) {
    cycles -= 1;
  }
  return cycles;
};

// ---------------------------------------------------------------------------
// Offline render
// ---------------------------------------------------------------------------

const getAmbientAssetModuleId = async (
  ambientKey: Exclude<AmbientSound, "none">
): Promise<number> => {
  // Dynamic import to avoid circular dependency — ambientAudioService
  // exports the AMBIENT_SOURCES map which maps keys to asset module IDs.
  const { AMBIENT_SOURCES } = await import("src/services/ambientAudioService");
  const moduleId = AMBIENT_SOURCES[ambientKey];
  if (moduleId === undefined) {
    throw new Error(`Unknown ambient sound key: ${ambientKey}`);
  }
  return moduleId;
};

export const renderMemoryAudioSession = async (args: {
  verseAudioUrl: string;
  ambientSoundKey: AmbientSound;
  recallCyclesTarget: number;
}): Promise<RenderedSession> => {
  const { verseAudioUrl, ambientSoundKey, recallCyclesTarget } = args;
  const clampedCycles = clampRecallCycles(
    0, // We don't know verse duration yet; clamp again after decode
    Math.max(6, recallCyclesTarget)
  );

  // ── Determine sample rate ──────────────────────────────────────────
  const sampleRate = await getDeviceSampleRate();

  // ── Decode verse audio ──────────────────────────────────────────────
  const verseArrayBuffer = await fetchVerseArrayBuffer(verseAudioUrl);

  // Create a temporary context just for decoding the verse to learn its duration
  const decodeCtx = new OfflineAudioContext(2, sampleRate, sampleRate);
  const verseBuffer = await decodeCtx.decodeAudioData(verseArrayBuffer);
  const verseDurationSeconds = verseBuffer.duration;

  if (verseDurationSeconds <= 0) {
    throw new Error("Verse audio has zero duration");
  }

  // Re-clamp recall cycles now that we know the verse duration
  const finalCycles = clampRecallCycles(
    verseDurationSeconds,
    Math.max(6, clampedCycles)
  );

  // ── Build timeline ──────────────────────────────────────────────────
  const timeline = computeTimeline(verseDurationSeconds, finalCycles);
  const totalDurationSeconds = timeline.at(-1)!.endSeconds;
  const totalSamples = Math.ceil(totalDurationSeconds * sampleRate);

  // ── Create offline context for full render ──────────────────────────
  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

  // Re-decode verse in this context
  const verseAudio = await offlineCtx.decodeAudioData(verseArrayBuffer);

  // ── Schedule verse plays ────────────────────────────────────────────
  const verseGain = offlineCtx.createGain();
  verseGain.gain.setValueAtTime(SPOKEN_PLAYBACK_VOLUME, 0);
  verseGain.connect(offlineCtx.destination);

  for (const entry of timeline) {
    if (
      entry.phase === "encoding_playing" ||
      entry.phase === "recall_playing"
    ) {
      const source = offlineCtx.createBufferSource();
      source.buffer = verseAudio;
      source.connect(verseGain);
      source.start(entry.startSeconds);
      source.stop(entry.endSeconds);
    }
  }

  // ── Schedule ambient ────────────────────────────────────────────────
  if (ambientSoundKey !== "none") {
    const moduleId = await getAmbientAssetModuleId(ambientSoundKey);
    const ambientArrayBuffer = await fetchAmbientArrayBuffer(moduleId);
    const ambientAudio = await offlineCtx.decodeAudioData(ambientArrayBuffer);

    const ambientSource = offlineCtx.createBufferSource();
    ambientSource.buffer = ambientAudio;
    ambientSource.loop = true;
    ambientSource.loopStart = 0;
    ambientSource.loopEnd = ambientAudio.duration;

    const ambientGain = offlineCtx.createGain();
    ambientSource.connect(ambientGain);
    ambientGain.connect(offlineCtx.destination);

    // Automate ambient volume: full during gaps, ducked during speech
    const duckedVolume = getSpokenMixVolume(ambientSoundKey);

    // Start at full ambient volume
    ambientGain.gain.setValueAtTime(AMBIENT_VOLUME, 0);

    // Very short ramp duration for ducking transitions (50ms)
    const DUCK_RAMP_SECONDS = 0.05;

    for (const entry of timeline) {
      if (
        entry.phase === "encoding_playing" ||
        entry.phase === "recall_playing"
      ) {
        // Duck at start of speech
        ambientGain.gain.setValueAtTime(
          AMBIENT_VOLUME,
          Math.max(0, entry.startSeconds - DUCK_RAMP_SECONDS)
        );
        ambientGain.gain.linearRampToValueAtTime(
          duckedVolume,
          entry.startSeconds
        );
        // Restore at end of speech
        ambientGain.gain.setValueAtTime(duckedVolume, entry.endSeconds);
        ambientGain.gain.linearRampToValueAtTime(
          AMBIENT_VOLUME,
          entry.endSeconds + DUCK_RAMP_SECONDS
        );
      }
    }

    // Fade out ambient during the final outro gap
    const lastEntry = timeline.at(-1)!;
    if (lastEntry.phase === "recall_gap" && lastEntry.gapDurationMs) {
      const fadeDurationSeconds =
        Math.min(FINAL_OUTRO_FADE_MS, lastEntry.gapDurationMs) / 1000;
      const fadeStartSeconds = lastEntry.endSeconds - fadeDurationSeconds;
      ambientGain.gain.setValueAtTime(AMBIENT_VOLUME, fadeStartSeconds);
      ambientGain.gain.linearRampToValueAtTime(0, lastEntry.endSeconds);
    }

    ambientSource.start(0);
    ambientSource.stop(totalDurationSeconds);
  }

  // ── Render ──────────────────────────────────────────────────────────
  const renderedBuffer = await offlineCtx.startRendering();

  return {
    buffer: renderedBuffer,
    durationSeconds: totalDurationSeconds,
    verseDurationSeconds,
    phaseTimeline: timeline,
  };
};
