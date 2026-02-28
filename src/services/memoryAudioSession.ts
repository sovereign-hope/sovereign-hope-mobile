import {
  AppState,
  AppStateStatus,
  EmitterSubscription,
  NativeEventSubscription,
} from "react-native";
import TrackPlayer, {
  Event,
  PlaybackActiveTrackChangedEvent,
} from "react-native-track-player";
import {
  AmbientSound,
  playAmbient,
  stopAmbient,
} from "src/services/ambientAudioService";

const ENCODING_PLAYS = 3;
const ENCODING_GAP_MS = 7000;
const GAP_SEQUENCE = [10_000, 20_000, 30_000, 45_000];

export type MemoryAudioSessionPhase =
  | "idle"
  | "fetching"
  | "encoding_playing"
  | "encoding_gap"
  | "recall_playing"
  | "recall_gap"
  | "completed"
  | "abandoned";

type SessionOutcome = "completed" | "abandoned";

type SessionHandlers = {
  getSelectedAmbientSound: () => AmbientSound;
  onSessionStarted: () => void;
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

let isSessionActive = false;
let isSessionPaused = false;
let isIntentionalStop = false;
let verseAudioUrl = "";
let recallCyclesTarget = 6;
let encodingPlaysCompleted = 0;
let recallCyclesCompleted = 0;
let currentPhase: MemoryAudioSessionPhase = "idle";
let currentGapDuration = 0;
let currentGapStartedAt: number | undefined;
let backgroundedAt: number | undefined;
let pendingPhaseAfterGap: "encoding_playing" | "recall_playing" | undefined;
let gapTimeout: ReturnType<typeof setTimeout> | undefined;
let handlers: SessionHandlers | undefined;
let subscriptions: Array<EmitterSubscription> = [];
let appStateListener: NativeEventSubscription | undefined;
let isHandlingQueueEnd = false;

const clearGapTimeout = (): void => {
  if (gapTimeout) {
    clearTimeout(gapTimeout);
    gapTimeout = undefined;
  }
};

const getRecallGapDuration = (completedCycles: number): number => {
  const index = Math.min(completedCycles, GAP_SEQUENCE.length - 1);
  return GAP_SEQUENCE[index];
};

const setPhase = (
  phase: MemoryAudioSessionPhase,
  gapDuration?: number
): void => {
  currentPhase = phase;
  handlers?.onPhaseChange(phase, gapDuration);
};

const scheduleGap = (
  duration: number,
  nextPhase: "encoding_playing" | "recall_playing"
): void => {
  clearGapTimeout();
  currentGapDuration = duration;
  currentGapStartedAt = Date.now();
  pendingPhaseAfterGap = nextPhase;
  setPhase(
    nextPhase === "encoding_playing" ? "encoding_gap" : "recall_gap",
    duration
  );
  const phaseAfterGap = nextPhase;
  gapTimeout = setTimeout(() => {
    void playVerse(phaseAfterGap);
  }, duration);
};

async function playVerse(
  phase: "encoding_playing" | "recall_playing"
): Promise<void> {
  if (!handlers || !verseAudioUrl) {
    return;
  }
  clearGapTimeout();
  currentGapDuration = 0;
  currentGapStartedAt = undefined;
  pendingPhaseAfterGap = undefined;
  isSessionPaused = false;

  isIntentionalStop = true;
  await TrackPlayer.reset();
  await TrackPlayer.add({
    id: `memory-audio-${Date.now()}`,
    url: verseAudioUrl,
    title: "Memory Verse Practice",
    artist: "Sovereign Hope Church",
  });
  await TrackPlayer.play();
  isIntentionalStop = false;
  setPhase(phase);
}

const cleanUpPlaybackResources = async (): Promise<void> => {
  clearGapTimeout();
  try {
    isIntentionalStop = true;
    await TrackPlayer.reset();
  } finally {
    isIntentionalStop = false;
  }
  await stopAmbient();
  handlers?.onAmbientPlayingChange(false);
};

const removeSubscriptions = (): void => {
  subscriptions.forEach((subscription) => {
    subscription.remove();
  });
  subscriptions = [];

  if (appStateListener) {
    appStateListener.remove();
    appStateListener = undefined;
  }
};

const finishSession = async (outcome: SessionOutcome): Promise<void> => {
  if (!isSessionActive) {
    return;
  }
  isSessionActive = false;
  isSessionPaused = false;
  await cleanUpPlaybackResources();
  removeSubscriptions();

  if (outcome === "completed") {
    setPhase("completed");
    handlers?.onSessionCompleted();
  } else {
    setPhase("abandoned");
    handlers?.onSessionAbandoned();
  }

  handlers = undefined;
  verseAudioUrl = "";
  pendingPhaseAfterGap = undefined;
  backgroundedAt = undefined;
  currentGapDuration = 0;
  currentGapStartedAt = undefined;
  recallCyclesCompleted = 0;
  encodingPlaysCompleted = 0;
};

const handlePlaybackEnded = async (): Promise<void> => {
  if (!isSessionActive || isSessionPaused || !handlers) {
    return;
  }

  isHandlingQueueEnd = true;
  try {
    if (currentPhase === "encoding_playing") {
      encodingPlaysCompleted += 1;
      handlers.onEncodingPlaysChange(encodingPlaysCompleted);
      if (encodingPlaysCompleted >= ENCODING_PLAYS) {
        await playVerse("recall_playing");
      } else {
        scheduleGap(ENCODING_GAP_MS, "encoding_playing");
      }
      return;
    }

    if (currentPhase === "recall_playing") {
      recallCyclesCompleted += 1;
      handlers.onRecallCyclesChange(recallCyclesCompleted);
      if (recallCyclesCompleted >= recallCyclesTarget) {
        await finishSession("completed");
      } else {
        scheduleGap(
          getRecallGapDuration(recallCyclesCompleted - 1),
          "recall_playing"
        );
      }
    }
  } finally {
    isHandlingQueueEnd = false;
  }
};

const handleActiveTrackChanged = (
  event: PlaybackActiveTrackChangedEvent
): void => {
  if (
    !isSessionActive ||
    isIntentionalStop ||
    isHandlingQueueEnd ||
    isSessionPaused
  ) {
    return;
  }

  if (event.lastTrack && !event.track && currentPhase.endsWith("_playing")) {
    void finishSession("abandoned");
  }
};

const onAppStateChanged = (nextAppState: AppStateStatus): void => {
  if (!isSessionActive || !handlers) {
    return;
  }

  if (nextAppState === "background") {
    backgroundedAt = Date.now();
    handlers.onBackgrounded(backgroundedAt);
    return;
  }

  if (nextAppState !== "active" || !backgroundedAt) {
    return;
  }

  const elapsedSinceBackground = Date.now() - backgroundedAt;
  backgroundedAt = undefined;

  if (
    !currentPhase.endsWith("_gap") ||
    !currentGapStartedAt ||
    !pendingPhaseAfterGap
  ) {
    return;
  }

  const elapsedGap = Date.now() - currentGapStartedAt;
  const remainingGap = Math.max(0, currentGapDuration - elapsedGap);

  if (elapsedSinceBackground >= currentGapDuration || remainingGap <= 0) {
    clearGapTimeout();
    void playVerse(pendingPhaseAfterGap);
    return;
  }

  clearGapTimeout();
  currentGapDuration = remainingGap;
  currentGapStartedAt = Date.now();
  const phaseAfterGap = pendingPhaseAfterGap;
  gapTimeout = setTimeout(() => {
    void playVerse(phaseAfterGap);
  }, remainingGap);
};

export const startMemoryAudioSessionEngine = async (
  args: StartSessionArgs
): Promise<void> => {
  if (isSessionActive) {
    await finishSession("abandoned");
  }

  handlers = {
    ...args,
  };
  isSessionActive = true;
  isSessionPaused = false;
  isIntentionalStop = false;
  encodingPlaysCompleted = 0;
  recallCyclesCompleted = 0;
  recallCyclesTarget = Math.max(6, args.recallCyclesTarget);
  verseAudioUrl = args.verseAudioUrl;
  setPhase("fetching");

  const selectedAmbient = handlers.getSelectedAmbientSound();
  const didStartAmbient = await playAmbient(selectedAmbient);
  handlers.onAmbientPlayingChange(didStartAmbient);
  handlers.onSessionStarted();

  subscriptions = [
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      void handlePlaybackEnded();
    }),
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
      handleActiveTrackChanged(event);
    }),
  ];

  appStateListener = AppState.addEventListener("change", onAppStateChanged);
  await playVerse("encoding_playing");
};

export const stopMemoryAudioSessionEngine = async (
  outcome: SessionOutcome = "abandoned"
): Promise<void> => {
  if (!isSessionActive) {
    return;
  }
  await finishSession(outcome);
};

export const isMemoryAudioSessionRunning = (): boolean => isSessionActive;

export const handleMemoryAudioRemotePlay = async (): Promise<boolean> => {
  if (!isSessionActive) {
    return false;
  }

  if (isSessionPaused) {
    isSessionPaused = false;
    if (currentPhase.endsWith("_playing")) {
      await TrackPlayer.play();
    } else if (
      currentPhase.endsWith("_gap") &&
      pendingPhaseAfterGap &&
      currentGapDuration > 0
    ) {
      scheduleGap(currentGapDuration, pendingPhaseAfterGap);
    }
  }
  return true;
};

export const handleMemoryAudioRemotePause = async (): Promise<boolean> => {
  if (!isSessionActive) {
    return false;
  }
  isSessionPaused = true;

  if (currentPhase.endsWith("_playing")) {
    await TrackPlayer.pause();
  } else if (currentPhase.endsWith("_gap") && currentGapStartedAt) {
    const elapsedGap = Date.now() - currentGapStartedAt;
    currentGapDuration = Math.max(0, currentGapDuration - elapsedGap);
    clearGapTimeout();
  }

  return true;
};

export const handleMemoryAudioRemoteStop = async (): Promise<boolean> => {
  if (!isSessionActive) {
    return false;
  }
  await finishSession("abandoned");
  return true;
};
