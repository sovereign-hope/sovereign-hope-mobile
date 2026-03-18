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
  SPOKEN_PLAYBACK_VOLUME,
  getEncodingGapDuration,
  getEncodingToRecallGapDuration,
  getFinalOutroDuration,
  getRecallCyclesForDuration,
  getRecallGapDuration,
  getSpokenMixVolume,
} from "src/services/memoryAudioConstants";
import type {
  MemoryAudioSessionPhase,
  SessionDurationMinutes,
} from "src/services/memoryAudioConstants";

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

type RenderProgressHandler = (progress: number, message: string) => void;

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
let cachedDeviceSampleRate: number | undefined;

/**
 * Query the device's native audio sample rate. On iOS this is typically 48000,
 * on Android it varies. Using the native rate avoids resampling artifacts —
 * if we render at 44100 but the live AudioContext plays at 48000, the audio
 * will be ~8.8% faster because react-native-audio-api may not resample.
 */
const getDeviceSampleRate = async (): Promise<number> => {
  if (cachedDeviceSampleRate !== undefined) {
    return cachedDeviceSampleRate;
  }
  try {
    const tempCtx = new AudioContext();
    const rate = tempCtx.sampleRate;
    await tempCtx.close();
    cachedDeviceSampleRate = rate > 0 ? rate : FALLBACK_SAMPLE_RATE;
    return cachedDeviceSampleRate;
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

    if (i < ENCODING_PLAYS - 1) {
      // Gap between encoding plays
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
    } else {
      // Longer gap after the final encoding play before recall begins
      const gapMs = getEncodingToRecallGapDuration(verseDurationSeconds);
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
      // Final outro gap after the last recall play — quiet ambient wind-down
      const outroDurationMs = getFinalOutroDuration();
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
  sessionDurationMinutes: SessionDurationMinutes;
  onProgress?: RenderProgressHandler;
}): Promise<RenderedSession> => {
  const { verseAudioUrl, ambientSoundKey, sessionDurationMinutes, onProgress } =
    args;
  const reportProgress = (progress: number, message: string): void => {
    onProgress?.(Math.max(0, Math.min(1, progress)), message);
  };

  // ── Determine sample rate ──────────────────────────────────────────
  reportProgress(0.08, "Getting audio ready...");
  const sampleRate = await getDeviceSampleRate();

  // ── Decode verse audio ──────────────────────────────────────────────
  reportProgress(0.18, "Loading verse audio...");
  const verseArrayBuffer = await fetchVerseArrayBuffer(verseAudioUrl);

  // Create a temporary context just for decoding the verse to learn its duration
  reportProgress(0.26, "Analyzing verse timing...");
  const decodeCtx = new OfflineAudioContext(2, sampleRate, sampleRate);
  const verseBuffer = await decodeCtx.decodeAudioData(verseArrayBuffer);
  const verseDurationSeconds = verseBuffer.duration;

  if (verseDurationSeconds <= 0) {
    throw new Error("Verse audio has zero duration");
  }

  // Compute recall cycles to fit within the target session duration
  const finalCycles = getRecallCyclesForDuration(
    verseDurationSeconds,
    sessionDurationMinutes
  );

  // ── Build timeline ──────────────────────────────────────────────────
  reportProgress(0.38, "Building your practice flow...");
  const timeline = computeTimeline(verseDurationSeconds, finalCycles);
  if (timeline.length === 0) {
    throw new Error("Timeline is empty — cannot render an audio session");
  }
  const totalDurationSeconds = timeline.at(-1)!.endSeconds;
  const totalSamples = Math.ceil(totalDurationSeconds * sampleRate);

  // ── Create offline context for full render ──────────────────────────
  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

  // Re-decode verse in this context
  reportProgress(0.48, "Preparing spoken track...");
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
  if (ambientSoundKey === "none") {
    reportProgress(0.74, "Finalizing spoken track...");
  } else {
    reportProgress(0.62, "Adding ambient sound...");
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
    reportProgress(0.74, "Balancing voice and ambient...");
  }

  // ── Render ──────────────────────────────────────────────────────────
  reportProgress(0.88, "Encoding session audio...");
  const renderedBuffer = await offlineCtx.startRendering();
  reportProgress(0.96, "Preparing playback...");

  return {
    buffer: renderedBuffer,
    durationSeconds: totalDurationSeconds,
    verseDurationSeconds,
    phaseTimeline: timeline,
  };
};
