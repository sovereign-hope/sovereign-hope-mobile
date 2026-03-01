import {
  AppState,
  AppStateStatus,
  EmitterSubscription,
  Image,
  NativeEventSubscription,
} from "react-native";
import { Audio } from "expo-av";
import TrackPlayer, {
  Event,
  PlaybackActiveTrackChangedEvent,
  PlaybackQueueEndedEvent,
} from "react-native-track-player";
import esvLogo from "../../assets/esv-logo.png";
import {
  AmbientSound,
  fadeOutAmbient,
  pauseAmbient,
  playAmbient,
  resumeAmbient,
  setAmbientGapMix,
  setAmbientSpeechMix,
  stopAmbient,
} from "src/services/ambientAudioService";
import { initializeTrackPlayer } from "src/services/trackPlayerSetup";

export const MEMORY_AUDIO_SESSION_TRACK_ID = "memory-audio-session-track";
const MEMORY_AUDIO_SESSION_TRACK_TITLE = "Memory Verse Practice";
const MEMORY_AUDIO_SESSION_TRACK_ARTIST = "Sovereign Hope Church";
const MEMORY_AUDIO_SESSION_TRACK_ALBUM = "Memory Audio Helper";
const MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI = Image.resolveAssetSource(
  esvLogo as number
).uri;
const ENCODING_PLAYS = 3;
const ENCODING_GAP_MS = 7000;
const GAP_SEQUENCE = [10_000, 20_000, 30_000, 45_000];
const FINAL_OUTRO_MIN_MS = 6000;
const FINAL_OUTRO_FADE_MS = 4000;
const SPOKEN_PLAYBACK_VOLUME = 1;

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

let isSessionActive = false;
let isSessionPaused = false;
let isIntentionalStop = false;
let verseAudioUrl = "";
let recallCyclesTarget = 6;
let encodingPlaysCompleted = 0;
let recallCyclesCompleted = 0;
let spokenVerseDurationSeconds = 0;
let currentPhase: MemoryAudioSessionPhase = "idle";
let currentGapDuration = 0;
let currentGapStartedAt: number | undefined;
let backgroundedAt: number | undefined;
let pendingPhaseAfterGap: "encoding_playing" | "recall_playing" | undefined;
let gapTimeout: ReturnType<typeof setTimeout> | undefined;
let fadeTimeout: ReturnType<typeof setTimeout> | undefined;
let handlers: SessionHandlers | undefined;
let subscriptions: Array<EmitterSubscription> = [];
let appStateListener: NativeEventSubscription | undefined;
let isHandlingQueueEnd = false;
let publishedSystemDurationSeconds = 0;
let plannedSessionDurationSeconds = 0;
const verseDurationCacheSeconds = new Map<string, number>();

const clearGapTimeout = (): void => {
  if (gapTimeout) {
    clearTimeout(gapTimeout);
    gapTimeout = undefined;
  }
  if (fadeTimeout) {
    clearTimeout(fadeTimeout);
    fadeTimeout = undefined;
  }
};

const getMinimumGapDurationMs = (verseDurationSeconds: number): number =>
  Math.max(0, Math.round(verseDurationSeconds * 1000));

const getEncodingGapDuration = (verseDurationSeconds: number): number =>
  Math.max(ENCODING_GAP_MS, getMinimumGapDurationMs(verseDurationSeconds));

const getFinalOutroDuration = (verseDurationSeconds: number): number =>
  Math.max(FINAL_OUTRO_MIN_MS, getMinimumGapDurationMs(verseDurationSeconds));

const getRecallGapDuration = (
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

const setPhase = (
  phase: MemoryAudioSessionPhase,
  gapDuration?: number
): void => {
  currentPhase = phase;
  handlers?.onPhaseChange(phase, gapDuration);
};

const probeVerseDurationSeconds = async (audioUrl: string): Promise<number> => {
  const cachedDurationSeconds = verseDurationCacheSeconds.get(audioUrl);
  if (cachedDurationSeconds !== undefined) {
    return cachedDurationSeconds;
  }

  let sound: Audio.Sound | undefined;
  try {
    const { sound: createdSound, status } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      {
        shouldPlay: false,
        volume: 0,
      }
    );
    sound = createdSound;
    const durationSeconds =
      status.isLoaded && typeof status.durationMillis === "number"
        ? status.durationMillis / 1000
        : 0;

    if (durationSeconds > 0) {
      verseDurationCacheSeconds.set(audioUrl, durationSeconds);
    }

    return durationSeconds;
  } catch {
    return 0;
  } finally {
    if (sound) {
      await sound.unloadAsync().catch(() => {});
    }
  }
};

const syncSystemSessionDuration = async (
  verseDurationSeconds: number
): Promise<void> => {
  const estimatedSessionDuration =
    plannedSessionDurationSeconds > 0
      ? plannedSessionDurationSeconds
      : getEstimatedMemoryAudioSessionDurationSeconds(
          verseDurationSeconds,
          recallCyclesTarget
        );
  if (estimatedSessionDuration <= 0) {
    return;
  }
  if (
    Math.abs(estimatedSessionDuration - publishedSystemDurationSeconds) < 0.5
  ) {
    return;
  }

  publishedSystemDurationSeconds = estimatedSessionDuration;
  const metadata = {
    title: MEMORY_AUDIO_SESSION_TRACK_TITLE,
    artist: MEMORY_AUDIO_SESSION_TRACK_ARTIST,
    album: MEMORY_AUDIO_SESSION_TRACK_ALBUM,
    artwork: MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI,
    duration: estimatedSessionDuration,
  };

  const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
  if (activeTrackIndex !== undefined) {
    await TrackPlayer.updateMetadataForTrack(activeTrackIndex, metadata);
  }
  await TrackPlayer.updateNowPlayingMetadata(metadata);
};

const queueSessionTrack = async (): Promise<void> => {
  isIntentionalStop = true;
  try {
    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: MEMORY_AUDIO_SESSION_TRACK_ID,
      url: verseAudioUrl,
      title: MEMORY_AUDIO_SESSION_TRACK_TITLE,
      artist: MEMORY_AUDIO_SESSION_TRACK_ARTIST,
      album: MEMORY_AUDIO_SESSION_TRACK_ALBUM,
      artwork: MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI,
      ...(plannedSessionDurationSeconds > 0
        ? { duration: plannedSessionDurationSeconds }
        : {}),
    });
    await TrackPlayer.skip(0);
  } finally {
    isIntentionalStop = false;
  }
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
  void setAmbientGapMix().catch(() => {});
  const phaseAfterGap = nextPhase;
  gapTimeout = setTimeout(() => {
    void playVerse(phaseAfterGap);
  }, duration);
};

const scheduleFinalOutroGap = (duration: number): void => {
  clearGapTimeout();
  currentGapDuration = duration;
  currentGapStartedAt = Date.now();
  pendingPhaseAfterGap = undefined;
  setPhase("recall_gap", duration);
  void setAmbientGapMix().catch(() => {});

  const fadeDuration = Math.min(FINAL_OUTRO_FADE_MS, duration);
  const fadeDelay = Math.max(0, duration - fadeDuration);

  fadeTimeout = setTimeout(() => {
    void fadeOutAmbient(fadeDuration).then((didFade) => {
      if (didFade) {
        handlers?.onAmbientPlayingChange(false);
      }
      return didFade;
    });
  }, fadeDelay);

  gapTimeout = setTimeout(() => {
    void finishSession("completed");
  }, duration);
};

async function playVerse(
  phase: "encoding_playing" | "recall_playing"
): Promise<void> {
  if (!handlers || !verseAudioUrl) {
    return;
  }
  try {
    clearGapTimeout();
    currentGapDuration = 0;
    currentGapStartedAt = undefined;
    pendingPhaseAfterGap = undefined;
    isSessionPaused = false;

    const queue = await TrackPlayer.getQueue();
    if (queue.length === 0) {
      await queueSessionTrack();
    }

    const activeTrackIndex = await TrackPlayer.getActiveTrackIndex();
    if (activeTrackIndex === undefined) {
      await TrackPlayer.skip(0);
    }

    setPhase(phase);
    await setAmbientSpeechMix();
    await TrackPlayer.setVolume(SPOKEN_PLAYBACK_VOLUME);
    await TrackPlayer.seekTo(0);
    await TrackPlayer.play();
    // TrackPlayer start can steal focus and pause expo-av ambient on first play.
    // Immediately re-assert ambient playback/mix so both layers stay active.
    const didResumeAmbient = await resumeAmbient();
    handlers?.onAmbientPlayingChange(didResumeAmbient);
    if (didResumeAmbient) {
      await setAmbientSpeechMix();
    }
    const progress = await TrackPlayer.getProgress();
    if (progress.duration > 0) {
      spokenVerseDurationSeconds = progress.duration;
      handlers?.onSpokenDurationChange(progress.duration);
      if (plannedSessionDurationSeconds <= 0) {
        plannedSessionDurationSeconds =
          getEstimatedMemoryAudioSessionDurationSeconds(
            progress.duration,
            recallCyclesTarget
          );
      }
      await syncSystemSessionDuration(progress.duration);
    }
  } catch {
    await finishSession("abandoned");
  }
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

async function finishSession(outcome: SessionOutcome): Promise<void> {
  if (!isSessionActive) {
    return;
  }
  isSessionActive = false;
  isSessionPaused = false;
  handlers?.onSessionPausedChange(false);
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
  spokenVerseDurationSeconds = 0;
  publishedSystemDurationSeconds = 0;
  plannedSessionDurationSeconds = 0;
}

const handlePlaybackEnded = async (
  event: PlaybackQueueEndedEvent
): Promise<void> => {
  if (!isSessionActive || isSessionPaused || !handlers) {
    return;
  }
  if (event.position > 0) {
    spokenVerseDurationSeconds = event.position;
    handlers?.onSpokenDurationChange(event.position);
    await syncSystemSessionDuration(event.position);
  }

  isHandlingQueueEnd = true;
  try {
    if (currentPhase === "encoding_playing") {
      encodingPlaysCompleted += 1;
      handlers.onEncodingPlaysChange(encodingPlaysCompleted);
      if (encodingPlaysCompleted >= ENCODING_PLAYS) {
        await playVerse("recall_playing");
      } else {
        scheduleGap(
          getEncodingGapDuration(spokenVerseDurationSeconds),
          "encoding_playing"
        );
      }
      return;
    }

    if (currentPhase === "recall_playing") {
      recallCyclesCompleted += 1;
      handlers.onRecallCyclesChange(recallCyclesCompleted);
      if (recallCyclesCompleted >= recallCyclesTarget) {
        scheduleFinalOutroGap(
          getFinalOutroDuration(spokenVerseDurationSeconds)
        );
      } else {
        scheduleGap(
          getRecallGapDuration(
            recallCyclesCompleted - 1,
            spokenVerseDurationSeconds
          ),
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

  if (event.track && event.track.id !== MEMORY_AUDIO_SESSION_TRACK_ID) {
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
  const isFinalOutroGap =
    currentPhase === "recall_gap" &&
    !pendingPhaseAfterGap &&
    recallCyclesCompleted >= recallCyclesTarget;

  if (
    !currentPhase.endsWith("_gap") ||
    !currentGapStartedAt ||
    (!pendingPhaseAfterGap && !isFinalOutroGap)
  ) {
    return;
  }

  const elapsedGap = Date.now() - currentGapStartedAt;
  const remainingGap = Math.max(0, currentGapDuration - elapsedGap);

  if (elapsedSinceBackground >= currentGapDuration || remainingGap <= 0) {
    clearGapTimeout();
    if (pendingPhaseAfterGap) {
      void playVerse(pendingPhaseAfterGap);
    } else if (isFinalOutroGap) {
      void finishSession("completed");
    }
    return;
  }

  if (pendingPhaseAfterGap) {
    clearGapTimeout();
    currentGapDuration = remainingGap;
    currentGapStartedAt = Date.now();
    const phaseAfterGap = pendingPhaseAfterGap;
    gapTimeout = setTimeout(() => {
      void playVerse(phaseAfterGap);
    }, remainingGap);
  } else if (isFinalOutroGap) {
    scheduleFinalOutroGap(remainingGap);
  }
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
  spokenVerseDurationSeconds = 0;
  publishedSystemDurationSeconds = 0;
  plannedSessionDurationSeconds = 0;
  recallCyclesTarget = Math.max(6, args.recallCyclesTarget);
  verseAudioUrl = args.verseAudioUrl;
  setPhase("fetching");

  const isTrackPlayerInitialized = await initializeTrackPlayer();
  if (!isTrackPlayerInitialized) {
    throw new Error("Unable to initialize TrackPlayer");
  }

  const probedVerseDurationSeconds = await probeVerseDurationSeconds(
    args.verseAudioUrl
  );
  if (probedVerseDurationSeconds > 0) {
    spokenVerseDurationSeconds = probedVerseDurationSeconds;
    handlers.onSpokenDurationChange(probedVerseDurationSeconds);
    plannedSessionDurationSeconds =
      getEstimatedMemoryAudioSessionDurationSeconds(
        probedVerseDurationSeconds,
        recallCyclesTarget
      );
  }

  const selectedAmbient = handlers.getSelectedAmbientSound();
  const didStartAmbient = await playAmbient(selectedAmbient);
  handlers.onAmbientPlayingChange(didStartAmbient);
  handlers.onSessionPausedChange(false);
  handlers.onSessionStarted();

  subscriptions = [
    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, (event) => {
      void handlePlaybackEnded(event);
    }),
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
      handleActiveTrackChanged(event);
    }),
  ];

  appStateListener = AppState.addEventListener("change", onAppStateChanged);
  await queueSessionTrack();
  if (spokenVerseDurationSeconds > 0) {
    await syncSystemSessionDuration(spokenVerseDurationSeconds);
  }
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

export async function handleMemoryAudioRemotePlay(): Promise<boolean> {
  if (!isSessionActive) {
    return false;
  }

  if (isSessionPaused) {
    isSessionPaused = false;
    handlers?.onSessionPausedChange(false);
    const didResumeAmbient = await resumeAmbient();
    handlers?.onAmbientPlayingChange(didResumeAmbient);
    if (didResumeAmbient) {
      if (currentPhase.endsWith("_playing")) {
        await setAmbientSpeechMix();
      } else if (currentPhase.endsWith("_gap")) {
        await setAmbientGapMix();
      }
    }
    if (currentPhase.endsWith("_playing")) {
      await TrackPlayer.setVolume(SPOKEN_PLAYBACK_VOLUME);
      await TrackPlayer.play();
    } else if (
      currentPhase.endsWith("_gap") &&
      pendingPhaseAfterGap &&
      currentGapDuration > 0
    ) {
      scheduleGap(currentGapDuration, pendingPhaseAfterGap);
    } else if (
      currentPhase === "recall_gap" &&
      !pendingPhaseAfterGap &&
      currentGapDuration > 0 &&
      recallCyclesCompleted >= recallCyclesTarget
    ) {
      scheduleFinalOutroGap(currentGapDuration);
    }
  }
  return true;
}

export async function handleMemoryAudioRemotePause(): Promise<boolean> {
  if (!isSessionActive) {
    return false;
  }
  isSessionPaused = true;
  handlers?.onSessionPausedChange(true);
  await pauseAmbient();
  handlers?.onAmbientPlayingChange(false);
  await TrackPlayer.pause();

  if (currentPhase.endsWith("_gap") && currentGapStartedAt) {
    const elapsedGap = Date.now() - currentGapStartedAt;
    currentGapDuration = Math.max(0, currentGapDuration - elapsedGap);
    clearGapTimeout();
  }

  return true;
}

export const pauseMemoryAudioSessionEngine = async (): Promise<boolean> =>
  handleMemoryAudioRemotePause();

export const resumeMemoryAudioSessionEngine = async (): Promise<boolean> =>
  handleMemoryAudioRemotePlay();

export async function handleMemoryAudioRemoteStop(): Promise<boolean> {
  if (!isSessionActive) {
    return false;
  }
  await finishSession("abandoned");
  return true;
}
