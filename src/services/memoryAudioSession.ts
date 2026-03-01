import { AmbientSound } from "src/services/ambientAudioService";
import {
  renderMemoryAudioSession,
  clearDecodedBufferCache,
} from "src/services/memoryAudioRenderer";
import {
  startMemoryAudioPlayback,
  stopMemoryAudioPlayback,
  pauseMemoryAudioPlayback,
  resumeMemoryAudioPlayback,
} from "src/services/memoryAudioPlayer";
import type { MemoryAudioSessionPhase } from "src/services/memoryAudioConstants";

// Re-export for backward compatibility
export {
  MEMORY_AUDIO_SESSION_TRACK_ID,
  getEstimatedMemoryAudioSessionDurationSeconds,
} from "src/services/memoryAudioConstants";
export type { MemoryAudioSessionPhase } from "src/services/memoryAudioConstants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionOutcome = "completed" | "abandoned";

type SessionHandlers = {
  getSelectedAmbientSound: () => AmbientSound;
  onSessionStarted: (sessionDurationSeconds: number) => void;
  onSessionPausedChange: (isPaused: boolean) => void;
  onSpokenDurationChange: (durationSeconds: number) => void;
  onPhaseChange: (phase: MemoryAudioSessionPhase, gapDuration?: number) => void;
  onEncodingPlaysChange: (value: number) => void;
  onRecallCyclesChange: (value: number) => void;
  onAmbientPlayingChange: (isPlaying: boolean) => void;
  onSessionCompleted: () => void;
  onSessionAbandoned: () => void;
  onBackgrounded: (timestamp: number) => void;
};

type StartSessionArgs = {
  verseAudioUrl: string;
  recallCyclesTarget: number;
} & SessionHandlers;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let isSessionActive = false;
let handlers: SessionHandlers | undefined;

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

const finishSession = async (outcome: SessionOutcome): Promise<void> => {
  if (!isSessionActive) return;

  isSessionActive = false;
  await stopMemoryAudioPlayback();
  clearDecodedBufferCache();

  if (outcome === "completed") {
    handlers?.onPhaseChange("completed");
    handlers?.onSessionCompleted();
  } else {
    handlers?.onPhaseChange("abandoned");
    handlers?.onSessionAbandoned();
  }

  handlers = undefined;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const startMemoryAudioSessionEngine = async (
  args: StartSessionArgs
): Promise<void> => {
  if (isSessionActive) {
    await finishSession("abandoned");
  }

  handlers = { ...args };
  isSessionActive = true;
  handlers.onPhaseChange("fetching");

  const selectedAmbient = handlers.getSelectedAmbientSound();

  try {
    const renderedSession = await renderMemoryAudioSession({
      verseAudioUrl: args.verseAudioUrl,
      ambientSoundKey: selectedAmbient,
      recallCyclesTarget: args.recallCyclesTarget,
    });

    handlers.onSpokenDurationChange(renderedSession.verseDurationSeconds);
    handlers.onAmbientPlayingChange(selectedAmbient !== "none");
    handlers.onSessionStarted(renderedSession.durationSeconds);

    await startMemoryAudioPlayback({
      renderedSession,
      handlers: {
        onPhaseChange: (phase, gapDurationMs) => {
          handlers?.onPhaseChange(phase, gapDurationMs);
        },
        onEncodingPlaysChange: (count) => {
          handlers?.onEncodingPlaysChange(count);
        },
        onRecallCyclesChange: (count) => {
          handlers?.onRecallCyclesChange(count);
        },
        onSessionCompleted: () => {
          isSessionActive = false;
          handlers?.onAmbientPlayingChange(false);
          handlers?.onSessionCompleted();
          handlers = undefined;
          clearDecodedBufferCache();
        },
        onPausedChange: (isPaused) => {
          handlers?.onSessionPausedChange(isPaused);
        },
      },
    });
  } catch (error) {
    isSessionActive = false;
    handlers = undefined;
    clearDecodedBufferCache();
    throw error;
  }
};

export const stopMemoryAudioSessionEngine = async (): Promise<void> => {
  if (!isSessionActive) return;
  await finishSession("abandoned");
};

export const pauseMemoryAudioSessionEngine = async (): Promise<boolean> =>
  pauseMemoryAudioPlayback();

export const resumeMemoryAudioSessionEngine = async (): Promise<boolean> =>
  resumeMemoryAudioPlayback();

export const isMemoryAudioSessionRunning = (): boolean => isSessionActive;
