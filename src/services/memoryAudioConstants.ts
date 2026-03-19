import { Image } from "react-native";
import esvLogo from "../../assets/esv-logo.png";

// ---------------------------------------------------------------------------
// Lock-screen / track metadata
// ---------------------------------------------------------------------------

export const MEMORY_AUDIO_SESSION_TRACK_ID = "memory-audio-session-track";
export const MEMORY_AUDIO_SESSION_TRACK_TITLE = "Memory Verse Practice";
export const MEMORY_AUDIO_SESSION_TRACK_ARTIST = "Sovereign Hope Church";
export const MEMORY_AUDIO_SESSION_TRACK_ALBUM = "Memory Audio Helper";
export const MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI = Image.resolveAssetSource(
  esvLogo as number
).uri;

// ---------------------------------------------------------------------------
// Session phase type
// ---------------------------------------------------------------------------

export type MemoryAudioSessionPhase =
  | "idle"
  | "fetching"
  | "encoding_playing"
  | "encoding_gap"
  | "recall_playing"
  | "recall_gap"
  | "completed"
  | "abandoned";

// ---------------------------------------------------------------------------
// Session timing constants
// ---------------------------------------------------------------------------

export const ENCODING_PLAYS = 3;
export const ENCODING_GAP_MS = 10_000;
export const ENCODING_TO_RECALL_GAP_MS = 15_000;
export const GAP_SEQUENCE = [15_000, 25_000, 35_000, 50_000, 60_000];
export const FINAL_OUTRO_MS = 120_000; // 2 minutes of quiet ambient
export const FINAL_OUTRO_FADE_MS = 15_000; // 15-second fade at the very end
export const SPOKEN_PLAYBACK_VOLUME = 1;

// ---------------------------------------------------------------------------
// Ambient volume constants
// ---------------------------------------------------------------------------

export const AMBIENT_VOLUME = 0.8;
export const SPOKEN_DUCKED_VOLUME = 0.15;
export const SPOKEN_DUCKED_VOLUME_UPBEAT = 0.1;
export const UPBEAT_AMBIENT_PREFIX = "upbeat-";

// ---------------------------------------------------------------------------
// Session duration presets
// ---------------------------------------------------------------------------

export type SessionDurationMinutes = 5 | 10 | 15 | 20;

export const SESSION_DURATION_OPTIONS: SessionDurationMinutes[] = [
  5, 10, 15, 20,
];

export const DEFAULT_SESSION_DURATION_MINUTES: SessionDurationMinutes = 10;

export const MAX_SESSION_DURATION_SECONDS = 20 * 60; // 20 minutes

// ---------------------------------------------------------------------------
// Pure timing functions
// ---------------------------------------------------------------------------

const getMinimumGapDurationMs = (verseDurationSeconds: number): number =>
  Math.max(0, Math.round(verseDurationSeconds * 1000));

export const getEncodingGapDuration = (verseDurationSeconds: number): number =>
  Math.max(ENCODING_GAP_MS, getMinimumGapDurationMs(verseDurationSeconds));

export const getEncodingToRecallGapDuration = (
  verseDurationSeconds: number
): number =>
  Math.max(
    ENCODING_TO_RECALL_GAP_MS,
    getMinimumGapDurationMs(verseDurationSeconds)
  );

export const getFinalOutroDuration = (): number => FINAL_OUTRO_MS;

export const getRecallGapDuration = (
  completedCycles: number,
  verseDurationSeconds: number
): number => {
  const index = Math.min(completedCycles, GAP_SEQUENCE.length - 1);
  return Math.max(
    GAP_SEQUENCE[index],
    getMinimumGapDurationMs(verseDurationSeconds)
  );
};

export const getEstimatedMemoryAudioSessionDurationSeconds = (
  verseDurationSeconds: number,
  recallCyclesTarget: number
): number => {
  if (verseDurationSeconds <= 0) {
    return 0;
  }

  const clampedRecallCyclesTarget = Math.max(1, recallCyclesTarget);
  const totalVersePlays = ENCODING_PLAYS + clampedRecallCyclesTarget;
  // Gaps between encoding plays
  let totalGapMs =
    getEncodingGapDuration(verseDurationSeconds) *
    Math.max(0, ENCODING_PLAYS - 1);
  // Gap between encoding and recall phases
  totalGapMs += getEncodingToRecallGapDuration(verseDurationSeconds);

  for (
    let recallGapIndex = 0;
    recallGapIndex < Math.max(0, clampedRecallCyclesTarget - 1);
    recallGapIndex += 1
  ) {
    totalGapMs += getRecallGapDuration(recallGapIndex, verseDurationSeconds);
  }
  totalGapMs += getFinalOutroDuration();

  return totalVersePlays * verseDurationSeconds + totalGapMs / 1000;
};

/**
 * Compute the number of recall cycles that best fit within a target duration.
 * Starts from a generous upper bound and decrements until the estimated
 * session fits within the target. Guarantees at least 1 recall cycle.
 */
export const getRecallCyclesForDuration = (
  verseDurationSeconds: number,
  targetMinutes: SessionDurationMinutes
): number => {
  if (verseDurationSeconds <= 0) return 1;
  const targetSeconds = targetMinutes * 60;
  let cycles = 20;
  while (
    cycles > 1 &&
    getEstimatedMemoryAudioSessionDurationSeconds(
      verseDurationSeconds,
      cycles
    ) > targetSeconds
  ) {
    cycles -= 1;
  }
  return cycles;
};

/**
 * Returns the spoken-mix volume for a given ambient sound key.
 * Upbeat tracks duck more aggressively to keep speech intelligible.
 */
export const getSpokenMixVolume = (ambientKey: string): number =>
  ambientKey.startsWith(UPBEAT_AMBIENT_PREFIX)
    ? SPOKEN_DUCKED_VOLUME_UPBEAT
    : SPOKEN_DUCKED_VOLUME;
