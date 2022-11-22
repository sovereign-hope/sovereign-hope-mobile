import TrackPlayer, { Event } from "react-native-track-player";

const jumpBack = async () => {
  const currentPosition = await TrackPlayer.getPosition();
  await TrackPlayer.seekTo(currentPosition - 15);
};

const jumpForward = async () => {
  const currentPosition = await TrackPlayer.getPosition();
  await TrackPlayer.seekTo(currentPosition + 15);
};

// service.js
// eslint-disable-next-line @typescript-eslint/require-await
const service = async function () {
  // This service needs to be registered for the module to work
  // but it will be used later in the "Receiving Events" section

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => {
    void jumpBack();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, () => {
    void jumpForward();
  });
};

// eslint-disable-next-line import/no-default-export
export default service;
