import {
  AudioContext,
  AudioBufferSourceNode,
  PlaybackNotificationManager,
  AudioManager,
} from "react-native-audio-api";
import TrackPlayer from "react-native-track-player";
import type {
  RenderedSession,
  PhaseTimelineEntry,
} from "src/services/memoryAudioRenderer";
import type { MemoryAudioSessionPhase } from "src/services/memoryAudioConstants";
import {
  MEMORY_AUDIO_SESSION_TRACK_TITLE,
  MEMORY_AUDIO_SESSION_TRACK_ARTIST,
  MEMORY_AUDIO_SESSION_TRACK_ALBUM,
  MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI,
} from "src/services/memoryAudioConstants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlaybackHandlers = {
  onPhaseChange: (
    phase: MemoryAudioSessionPhase,
    gapDurationMs?: number
  ) => void;
  onEncodingPlaysChange: (count: number) => void;
  onRecallCyclesChange: (count: number) => void;
  onSessionCompleted: () => void;
  onPausedChange: (isPaused: boolean) => void;
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let audioContext: AudioContext | undefined;
let sourceNode: AudioBufferSourceNode | undefined;
let phaseTimeline: PhaseTimelineEntry[] = [];
let phaseTrackingInterval: ReturnType<typeof setInterval> | undefined;
let lastEmittedPhaseIndex = -1;
let currentHandlers: PlaybackHandlers | undefined;
let isPlaying = false;
let playbackSubscriptions: Array<{ remove: () => void }> = [];
let renderedBuffer: RenderedSession["buffer"] | undefined;
let sourceStartedAtContextSeconds = 0;
let playbackOffsetSeconds = 0;

// ---------------------------------------------------------------------------
// Audio session configuration
// ---------------------------------------------------------------------------

const configureAudioSession = (): void => {
  AudioManager.setAudioSessionOptions({
    iosCategory: "playback",
    iosMode: "spokenAudio",
  });
  AudioManager.observeAudioInterruptions(true);
};

// ---------------------------------------------------------------------------
// Lock screen
// ---------------------------------------------------------------------------

const showLockScreenNotification = async (
  durationSeconds: number
): Promise<void> => {
  await PlaybackNotificationManager.show({
    title: MEMORY_AUDIO_SESSION_TRACK_TITLE,
    artist: MEMORY_AUDIO_SESSION_TRACK_ARTIST,
    album: MEMORY_AUDIO_SESSION_TRACK_ALBUM,
    artwork: MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI,
    duration: durationSeconds,
    state: "playing",
    elapsedTime: 0,
  });

  await PlaybackNotificationManager.enableControl("play", true);
  await PlaybackNotificationManager.enableControl("pause", true);
  await PlaybackNotificationManager.enableControl("next", false);
  await PlaybackNotificationManager.enableControl("previous", false);
  await PlaybackNotificationManager.enableControl("seekTo", false);
};

const hideLockScreenNotification = async (): Promise<void> => {
  await PlaybackNotificationManager.hide().catch(() => {});
};

// ---------------------------------------------------------------------------
// Phase tracking
// ---------------------------------------------------------------------------

const PHASE_TRACKING_INTERVAL_MS = 1000;

const findPhaseIndex = (
  timeline: PhaseTimelineEntry[],
  currentTime: number
): number => {
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    if (currentTime >= timeline[i].startSeconds) {
      return i;
    }
  }
  return 0;
};

const emitPhaseUpdate = (entry: PhaseTimelineEntry): void => {
  if (!currentHandlers) return;

  currentHandlers.onPhaseChange(entry.phase, entry.gapDurationMs);
  currentHandlers.onEncodingPlaysChange(entry.encodingPlaysCompleted);
  currentHandlers.onRecallCyclesChange(entry.recallCyclesCompleted);
};

const getPlaybackPositionSeconds = (ctx: AudioContext): number => {
  const rawPositionSeconds =
    playbackOffsetSeconds +
    Math.max(0, ctx.currentTime - sourceStartedAtContextSeconds);
  const durationSeconds = renderedBuffer?.duration ?? 0;
  if (durationSeconds <= 0) {
    return rawPositionSeconds;
  }
  return Math.min(durationSeconds, rawPositionSeconds);
};

const emitProgressUpdate = (ctx: AudioContext): void => {
  const currentTime = getPlaybackPositionSeconds(ctx);

  if (phaseTimeline.length > 0) {
    const index = findPhaseIndex(phaseTimeline, currentTime);
    if (index !== lastEmittedPhaseIndex) {
      lastEmittedPhaseIndex = index;
      emitPhaseUpdate(phaseTimeline[index]);
    }
  }

  void PlaybackNotificationManager.show({
    elapsedTime: currentTime,
  }).catch(() => {});
};

const stopPhaseTracking = (): void => {
  if (phaseTrackingInterval) {
    clearInterval(phaseTrackingInterval);
    phaseTrackingInterval = undefined;
  }
  lastEmittedPhaseIndex = -1;
};

const startPhaseTracking = (
  timeline: PhaseTimelineEntry[],
  ctx: AudioContext
): void => {
  if (timeline.length === 0) {
    return;
  }

  stopPhaseTracking();

  phaseTrackingInterval = setInterval(() => {
    if (
      !currentHandlers ||
      ctx.state !== "running" ||
      audioContext !== ctx ||
      phaseTimeline !== timeline
    ) {
      return;
    }

    emitProgressUpdate(ctx);
  }, PHASE_TRACKING_INTERVAL_MS);
};

const createSourceNode = (ctx: AudioContext, offsetSeconds: number): void => {
  if (!renderedBuffer) {
    return;
  }

  const node = ctx.createBufferSource();
  node.buffer = renderedBuffer;
  node.connect(ctx.destination);

  // Handle natural completion only for the currently active node.
  // eslint-disable-next-line unicorn/prefer-add-event-listener
  node.onEnded = () => {
    if (sourceNode !== node) {
      return;
    }
    void handlePlaybackEnded();
  };

  sourceNode = node;
  playbackOffsetSeconds = offsetSeconds;
  sourceStartedAtContextSeconds = ctx.currentTime;
  node.start(0, offsetSeconds);
};

// ---------------------------------------------------------------------------
// Lock screen event listeners
// ---------------------------------------------------------------------------

const removeLockScreenListeners = (): void => {
  for (const subscription of playbackSubscriptions) {
    subscription.remove();
  }
  playbackSubscriptions = [];
};

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

const cleanUp = async (): Promise<void> => {
  stopPhaseTracking();
  removeLockScreenListeners();

  if (sourceNode) {
    const nodeToStop = sourceNode;
    sourceNode = undefined;
    try {
      nodeToStop.stop();
    } catch {
      // Already stopped
    }
  }

  if (audioContext) {
    try {
      await audioContext.close();
    } catch {
      // Already closed
    }
    audioContext = undefined;
  }

  await hideLockScreenNotification();

  phaseTimeline = [];
  currentHandlers = undefined;
  isPlaying = false;
  renderedBuffer = undefined;
  sourceStartedAtContextSeconds = 0;
  playbackOffsetSeconds = 0;
  lastEmittedPhaseIndex = -1;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const stopMemoryAudioPlayback = async (): Promise<void> => {
  if (!audioContext && !sourceNode) return;
  await cleanUp();
};

export const pauseMemoryAudioPlayback = async (): Promise<boolean> => {
  if (!audioContext || !isPlaying) return false;

  await audioContext.suspend();
  isPlaying = false;

  await PlaybackNotificationManager.show({ state: "paused" }).catch(() => {});
  currentHandlers?.onPausedChange(true);
  return true;
};

export const resumeMemoryAudioPlayback = async (): Promise<boolean> => {
  if (!audioContext || isPlaying) return false;

  await audioContext.resume();
  isPlaying = true;

  await PlaybackNotificationManager.show({ state: "playing" }).catch(() => {});
  emitProgressUpdate(audioContext);
  currentHandlers?.onPausedChange(false);
  return true;
};

export const seekMemoryAudioPlayback = async (
  positionSeconds: number
): Promise<boolean> => {
  if (!audioContext || !sourceNode || !renderedBuffer) {
    return false;
  }

  const clampedPosition = Math.max(
    0,
    Math.min(positionSeconds, renderedBuffer.duration)
  );

  if (clampedPosition >= renderedBuffer.duration) {
    await handlePlaybackEnded();
    return true;
  }

  const previousNode = sourceNode;
  sourceNode = undefined;

  try {
    previousNode.stop();
  } catch {
    // Already stopped
  }

  createSourceNode(audioContext, clampedPosition);
  emitProgressUpdate(audioContext);
  return true;
};

const setupLockScreenListeners = (): void => {
  removeLockScreenListeners();

  playbackSubscriptions = [
    PlaybackNotificationManager.addEventListener(
      "playbackNotificationPlay",
      () => {
        void resumeMemoryAudioPlayback();
      }
    ),
    PlaybackNotificationManager.addEventListener(
      "playbackNotificationPause",
      () => {
        void pauseMemoryAudioPlayback();
      }
    ),
  ];
};

async function handlePlaybackEnded(): Promise<void> {
  const completedHandlers = currentHandlers;
  await cleanUp();
  completedHandlers?.onPhaseChange("completed");
  completedHandlers?.onSessionCompleted();
}

export const startMemoryAudioPlayback = async (args: {
  renderedSession: RenderedSession;
  handlers: PlaybackHandlers;
}): Promise<void> => {
  const { renderedSession, handlers } = args;

  // Stop any existing playback
  await stopMemoryAudioPlayback();

  currentHandlers = handlers;
  phaseTimeline = renderedSession.phaseTimeline;
  renderedBuffer = renderedSession.buffer;

  // Release TrackPlayer's audio session hold
  try {
    await TrackPlayer.reset();
  } catch {
    // TrackPlayer may not be initialized — that's fine
  }

  // Configure audio session for spoken content
  configureAudioSession();

  // Create live AudioContext and play the rendered buffer
  audioContext = new AudioContext();
  createSourceNode(audioContext, 0);
  isPlaying = true;

  // Set up lock screen and phase tracking
  await showLockScreenNotification(renderedSession.durationSeconds);
  setupLockScreenListeners();
  startPhaseTracking(phaseTimeline, audioContext);

  // Emit initial phase + elapsed position immediately.
  emitProgressUpdate(audioContext);
};

export const isMemoryAudioPlaying = (): boolean => isPlaying;
