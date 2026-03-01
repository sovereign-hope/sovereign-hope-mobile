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
export const ENCODING_GAP_MS = 7000;
export const GAP_SEQUENCE = [10_000, 20_000, 30_000, 45_000];
export const FINAL_OUTRO_MIN_MS = 6000;
export const FINAL_OUTRO_FADE_MS = 4000;
export const SPOKEN_PLAYBACK_VOLUME = 1;

// ---------------------------------------------------------------------------
// Ambient volume constants
// ---------------------------------------------------------------------------

export const AMBIENT_VOLUME = 0.3;
export const SPOKEN_DUCKED_VOLUME = 0.09;
export const SPOKEN_DUCKED_VOLUME_UPBEAT = 0.06;
export const UPBEAT_AMBIENT_PREFIX = "upbeat-";

// ---------------------------------------------------------------------------
// Session rendering limits
// ---------------------------------------------------------------------------

export const MAX_SESSION_DURATION_SECONDS = 810; // 15 minutes

// ---------------------------------------------------------------------------
// Pure timing functions
// ---------------------------------------------------------------------------

const getMinimumGapDurationMs = (verseDurationSeconds: number): number =>
  Math.max(0, Math.round(verseDurationSeconds * 1000));

export const getEncodingGapDuration = (verseDurationSeconds: number): number =>
  Math.max(ENCODING_GAP_MS, getMinimumGapDurationMs(verseDurationSeconds));

export const getFinalOutroDuration = (verseDurationSeconds: number): number =>
  Math.max(FINAL_OUTRO_MIN_MS, getMinimumGapDurationMs(verseDurationSeconds));

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

  const clampedRecallCyclesTarget = Math.max(6, recallCyclesTarget);
  const totalVersePlays = ENCODING_PLAYS + clampedRecallCyclesTarget;
  let totalGapMs =
    getEncodingGapDuration(verseDurationSeconds) *
    Math.max(0, ENCODING_PLAYS - 1);

  for (
    let recallGapIndex = 0;
    recallGapIndex < Math.max(0, clampedRecallCyclesTarget - 1);
    recallGapIndex += 1
  ) {
    totalGapMs += getRecallGapDuration(recallGapIndex, verseDurationSeconds);
  }
  totalGapMs += getFinalOutroDuration(verseDurationSeconds);

  return totalVersePlays * verseDurationSeconds + totalGapMs / 1000;
};

/**
 * Returns the spoken-mix volume for a given ambient sound key.
 * Upbeat tracks duck more aggressively to keep speech intelligible.
 */
export const getSpokenMixVolume = (ambientKey: string): number =>
  ambientKey.startsWith(UPBEAT_AMBIENT_PREFIX)
    ? SPOKEN_DUCKED_VOLUME_UPBEAT
    : SPOKEN_DUCKED_VOLUME;
