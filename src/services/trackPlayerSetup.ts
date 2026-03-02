import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from "react-native-track-player";

const CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.JumpForward,
  Capability.JumpBackward,
  Capability.Stop,
  Capability.SeekTo,
];

let setupPromise: Promise<boolean> | undefined;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const updateTrackPlayerOptions = async (): Promise<void> => {
  await TrackPlayer.updateOptions({
    capabilities: CAPABILITIES,
    notificationCapabilities: CAPABILITIES,
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.PausePlayback,
    },
  });
};

const setupTrackPlayer = async (): Promise<boolean> => {
  let isInitialized = false;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await TrackPlayer.getPlaybackState();
      isInitialized = true;
      break;
    } catch {
      try {
        await TrackPlayer.setupPlayer();
        isInitialized = true;
        break;
      } catch (error) {
        const message =
          error instanceof Error ? error.message.toLowerCase() : "";
        if (message.includes("already")) {
          isInitialized = true;
          break;
        }
        if (attempt === 2) {
          console.warn("TrackPlayer setup failed", error);
          return false;
        }
        // Give native thread initialization a beat during bundle reload.
        // eslint-disable-next-line no-await-in-loop
        await delay(150);
      }
    }
  }

  if (!isInitialized) {
    return false;
  }

  try {
    await updateTrackPlayerOptions();
  } catch (error) {
    console.warn("TrackPlayer updateOptions failed", error);
    return false;
  }

  return true;
};

export const initializeTrackPlayer = async (): Promise<boolean> => {
  if (!setupPromise) {
    setupPromise = (async () => {
      const isReady = await setupTrackPlayer();
      if (!isReady) {
        setupPromise = undefined;
      }
      return isReady;
    })();
  }

  return setupPromise;
};
