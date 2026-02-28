import TrackPlayer, { Event } from "react-native-track-player";
import {
  handleMemoryAudioRemotePause,
  handleMemoryAudioRemotePlay,
  handleMemoryAudioRemoteStop,
  isMemoryAudioSessionRunning,
} from "src/services/memoryAudioSession";

const jumpBack = async () => {
  const { position } = await TrackPlayer.getProgress();
  await TrackPlayer.seekTo(position - 15);
};

const jumpForward = async () => {
  const { position } = await TrackPlayer.getProgress();
  await TrackPlayer.seekTo(position + 15);
};

// service.js
// eslint-disable-next-line @typescript-eslint/require-await
const service = async function () {
  // This service needs to be registered for the module to work
  // but it will be used later in the "Receiving Events" section

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void (async () => {
      const handledByMemorySession = await handleMemoryAudioRemotePlay();
      if (!handledByMemorySession) {
        await TrackPlayer.play();
      }
    })();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void (async () => {
      const handledByMemorySession = await handleMemoryAudioRemotePause();
      if (!handledByMemorySession) {
        await TrackPlayer.pause();
      }
    })();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => {
    void (async () => {
      if (!isMemoryAudioSessionRunning()) {
        await jumpBack();
      }
    })();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, () => {
    void (async () => {
      if (!isMemoryAudioSessionRunning()) {
        await jumpForward();
      }
    })();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void (async () => {
      const handledByMemorySession = await handleMemoryAudioRemoteStop();
      if (!handledByMemorySession) {
        await TrackPlayer.reset();
      }
    })();
  });
};

export default service;
