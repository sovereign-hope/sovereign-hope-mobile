import TrackPlayer, { Event } from "react-native-track-player";
import { isMemoryAudioSessionRunning } from "src/services/memoryAudioSession";

const jumpBack = async () => {
  const { position } = await TrackPlayer.getProgress();
  await TrackPlayer.seekTo(position - 15);
};

const jumpForward = async () => {
  const { position } = await TrackPlayer.getProgress();
  await TrackPlayer.seekTo(position + 15);
};

// eslint-disable-next-line @typescript-eslint/require-await
const service = async function () {
  // Memory audio lock screen controls are handled by PlaybackNotificationManager
  // in memoryAudioPlayer.ts, not through TrackPlayer remote events. If a memory
  // session is running, ignore all TrackPlayer remote events.

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void (async () => {
      if (isMemoryAudioSessionRunning()) return;
      await TrackPlayer.play();
    })();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void (async () => {
      if (isMemoryAudioSessionRunning()) return;
      await TrackPlayer.pause();
    })();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => {
    void (async () => {
      if (isMemoryAudioSessionRunning()) return;
      await jumpBack();
    })();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, () => {
    void (async () => {
      if (isMemoryAudioSessionRunning()) return;
      await jumpForward();
    })();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void (async () => {
      if (isMemoryAudioSessionRunning()) return;
      await TrackPlayer.reset();
    })();
  });
};

export default service;
