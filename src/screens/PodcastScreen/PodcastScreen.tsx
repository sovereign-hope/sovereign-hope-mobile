import React, { useEffect, useState, useRef } from "react";
import {
  Animated,
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import {
  getEpisodes,
  selectEpisodes,
  selectIsLoading,
} from "src/redux/podcastSlice";
import { styles } from "./PodcastScreen.styles";
import { FeedItem } from "react-native-rss-parser";
import TrackPlayer, {
  Capability,
  ResourceObject,
  Track,
} from "react-native-track-player";
import playerService from "../../../service";
import thumbnail from "../../../assets/podcast-icon.png";
import icon from "../../../assets/icon.png";
import { MiniPlayer } from "./MiniPlayer";
import * as Haptics from "expo-haptics";
import { MenuView } from "@react-native-menu/menu";
import { FlatButton } from "src/components";

type Props = NativeStackScreenProps<RootStackParamList, "Podcast">;

export const PodcastScreen: React.FunctionComponent<Props> = ({}: Props) => {
  // Custom hooks
  const dispatch = useDispatch();
  const theme = useTheme();
  const episodes = useAppSelector(selectEpisodes);
  const isLoading = useAppSelector(selectIsLoading);

  // Ref Hooks
  const mountAnimation = useRef(new Animated.Value(0)).current;

  // State hooks
  const [currentTrack, setCurrentTrack] = useState<Track>();

  // Callback hooks

  // Effect hooks
  useEffect(() => {
    if (!isLoading) {
      Animated.timing(mountAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, unicorn/prefer-module
    TrackPlayer.registerPlaybackService(() => playerService);

    async function setupPlayer() {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.JumpForward,
          Capability.JumpBackward,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
      });
    }

    void setupPlayer();
  }, []);

  useEffect(() => {
    dispatch(getEpisodes());
  }, [dispatch]);

  // Event handlers
  const playEpisode = async (episode: FeedItem) => {
    await TrackPlayer.reset();
    const track: Track = {
      url: episode.enclosures[0].url,
      artwork: icon as ResourceObject,
      title: episode.title,
      artist: "Sovereign Hope Church",
      date: episode.published,
      description: episode.description,
      duration: Number.parseInt(episode.enclosures[0].length, 10) / 60,
    };
    await TrackPlayer.add(track);
    await TrackPlayer.play();
    setCurrentTrack(track);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Constants
  const themedStyles = styles({ theme });

  return (
    <SafeAreaView edges={["left", "right"]} style={themedStyles.screen}>
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.text} />
      ) : (
        <Animated.View style={{ flex: 1, opacity: mountAnimation }}>
          <FlatList
            data={episodes}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={themedStyles.list}
            initialNumToRender={20}
            keyExtractor={(item: FeedItem) => item.title}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => void playEpisode(item)}
                accessibilityRole="button"
                key={item.title}
                style={({ pressed }) => [
                  themedStyles.listItem,
                  {
                    backgroundColor: pressed
                      ? theme.colors.background
                      : theme.colors.card,
                  },
                ]}
              >
                <Image
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                  source={thumbnail}
                  style={themedStyles.listItemImage}
                  accessibilityIgnoresInvertColors
                />
                <View style={themedStyles.listItemContent}>
                  <Text style={themedStyles.listItemTitle}>{item.title}</Text>
                  <Text style={themedStyles.listItemText}>
                    {item.description.trim()}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.border}
                  style={themedStyles.disclosureIcon}
                />
              </Pressable>
            )}
          />
          {<MiniPlayer track={currentTrack} />}
          <MenuView
            title="Menu Title"
            onPressAction={({ nativeEvent }) => {
              const action = nativeEvent.event;

              switch (action) {
                case "apple": {
                  void Linking.openURL(
                    "https://podcasts.apple.com/us/podcast/sovereign-hope-church/id337407161"
                  );

                  break;
                }
                case "spotify": {
                  void Linking.openURL(
                    "https://open.spotify.com/show/4YbGvwxTTOvmBGrPpet83L"
                  );

                  break;
                }
                case "google": {
                  void Linking.openURL(
                    "https://podcasts.google.com/?feed=aHR0cHM6Ly9zb3ZlcmVpZ25ob3BlLmNodXJjaC9yc3MvYXVkaW8ueG1s"
                  );

                  break;
                }
                case "overcast": {
                  void Linking.openURL(
                    "https://overcast.fm/itunes337407161/sovereign-hope-church"
                  );

                  break;
                }
                case "pocketcasts": {
                  void Linking.openURL("https://pca.st/itunes/337407161");

                  break;
                }
                case "castro": {
                  void Linking.openURL(
                    "https://castro.fm/podcast/24f2841a-93e8-4599-8a5a-c451bb5ca7da"
                  );

                  break;
                }
                case "stitcher": {
                  void Linking.openURL(
                    "https://www.stitcher.com/s?fid=337407161"
                  );

                  break;
                }
                // No default
              }
            }}
            actions={[
              {
                id: "apple",
                title: "Subscribe on Apple Podcasts",
              },
              {
                id: "spotify",
                title: "Subscribe on Spotify",
              },
              {
                id: "google",
                title: "Subscribe on Google Podcasts",
              },
              {
                id: "overcast",
                title: "Subscribe on Overcast",
              },
              {
                id: "pocketcasts",
                title: "Subscribe on Pocket Casts",
              },
              {
                id: "castro",
                title: "Subscribe on Castro",
              },
              {
                id: "stitcher",
                title: "Subscribe on Stitcher",
              },
            ]}
          >
            <FlatButton
              title="Subscribe Now"
              onPress={() => {}}
              style={themedStyles.subscribeButton}
            />
          </MenuView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};
