import { Image, ImageSourcePropType } from "react-native";
import TrackPlayer, { Track } from "react-native-track-player";
import * as Haptics from "expo-haptics";
import { initializeTrackPlayer } from "src/services/trackPlayerSetup";
import { store } from "src/app/store";
import { stopMemoryAudioSession } from "src/redux/memoryAudioSlice";
import esvLogo from "../../assets/esv-logo.png";

export const playPassageAudio = async (
  url: string,
  title: string
): Promise<void> => {
  const esvLogoSource = esvLogo as ImageSourcePropType;
  const isTrackPlayerInitialized = await initializeTrackPlayer();
  if (!isTrackPlayerInitialized) {
    return;
  }

  await store.dispatch(stopMemoryAudioSession());
  await TrackPlayer.reset();
  const track: Track = {
    url,
    title,
    artist: "ESV Bible",
    artwork: Image.resolveAssetSource(esvLogoSource).uri,
  };
  await TrackPlayer.add(track);
  await TrackPlayer.play();
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};
