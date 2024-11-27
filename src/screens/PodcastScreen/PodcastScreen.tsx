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
  ListRenderItem,
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
import TrackPlayer, { Track } from "react-native-track-player";
import thumbnail from "../../../assets/podcast-icon.png";
import icon from "../../../assets/icon.png";
import { MiniPlayer } from "../../components/MiniPlayer/MiniPlayer";
import * as Haptics from "expo-haptics";
import { MenuView, NativeActionEvent } from "@react-native-menu/menu";
import { FlatButton } from "src/components";
import { colors } from "src/style/colors";
import { spacing } from "src/style/layout";
import { ScrollView } from "react-native-gesture-handler";

type Props = NativeStackScreenProps<RootStackParamList, "Resources">;

const playEpisode = async (episode: FeedItem) => {
  await TrackPlayer.reset();
  const track: Track = {
    url: episode.enclosures[0].url,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    artwork: icon,
    title: episode.title,
    artist: "Sovereign Hope Church",
    date: episode.published,
    description: episode.description,
    duration: Number.parseInt(episode.enclosures[0].length, 10) / 60,
  };
  await TrackPlayer.add(track);
  await TrackPlayer.play();
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
};

const handleMenuPress = ({ nativeEvent }: NativeActionEvent) => {
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
      void Linking.openURL("https://www.stitcher.com/s?fid=337407161");

      break;
    }
    // No default
  }
};

export const PodcastScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  const dispatch = useDispatch();
  const theme = useTheme();
  const episodes = useAppSelector(selectEpisodes);
  const isLoading = useAppSelector(selectIsLoading);

  // Ref Hooks
  const mountAnimation = useRef(new Animated.Value(0)).current;

  // State hooks

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
    dispatch(getEpisodes());
  }, [dispatch]);

  // Event handlers

  // Constants
  const themedStyles = styles({ theme });
  const menuActions = [
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
  ];

  const renderEpisodeItem: ListRenderItem<FeedItem> = ({ item }) => {
    return (
      <Pressable
        key={item.title}
        onPress={() => void playEpisode(item)}
        accessibilityRole="button"
        style={({ pressed }) => [
          themedStyles.contentCard,
          {
            marginRight: 0,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          source={thumbnail}
          style={themedStyles.image}
          accessibilityIgnoresInvertColors
        />
        <View style={{ ...themedStyles.contentCardColumn, maxWidth: 200 }}>
          <Text style={themedStyles.contentCardHeader}>{item.title}</Text>
          <Text style={themedStyles.text}>{item.description.trim()}</Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={theme.colors.border}
          style={themedStyles.disclosureIcon}
        />
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={["left", "right"]} style={themedStyles.screen}>
      <MiniPlayer id="sermons-mini-player" />

      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.text} />
        ) : (
          <Animated.View
            style={{
              flex: 1,
              opacity: mountAnimation,
              paddingTop: spacing.large,
            }}
          >
            <View style={themedStyles.headerRow}>
              <Text
                style={{
                  ...themedStyles.header,
                }}
              >
                Podcast
              </Text>

              <MenuView
                title="Menu Title"
                onPressAction={handleMenuPress}
                actions={menuActions}
              >
                <Pressable
                  style={({ pressed }) => [
                    themedStyles.textButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="button"
                  onPress={() => {}}
                >
                  <Text style={{ color: colors.accent, fontSize: 18 }}>
                    Subscribe
                  </Text>
                </Pressable>
              </MenuView>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={episodes}
              renderItem={renderEpisodeItem}
              initialNumToRender={20}
              onScrollToIndexFailed={(info) => {
                console.log(info);
              }}
              contentContainerStyle={{
                marginTop: spacing.small,
                paddingRight: spacing.large,
              }}
            />
            <View style={themedStyles.headerRow}>
              <Text
                style={{
                  ...themedStyles.header,
                }}
              >
                Links
              </Text>
            </View>
            <Pressable
              onPress={() => {
                void Linking.openURL("https://sovereignhope.church/watch-live");
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                themedStyles.contentCard,
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={themedStyles.contentCardColumn}>
                <Text style={themedStyles.contentCardHeader}>
                  Sunday Mornings
                </Text>
                <Text style={themedStyles.text}>
                  Watch the live stream, download the manuscript, or view the
                  bulletin.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={theme.colors.border}
                style={themedStyles.disclosureIcon}
              />
            </Pressable>
            {/* <Pressable
              onPress={() => {
                void Linking.openURL("https://sovereignhope.church/schedule");
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                themedStyles.contentCard,
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={themedStyles.contentCardColumn}>
                <Text style={themedStyles.contentCardHeader}>Registrations</Text>
                <Text>
                  View the signups for all upcoming clases and events at
                  Sovereign Hope.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={theme.colors.border}
                style={themedStyles.disclosureIcon}
              />
            </Pressable> */}
            <Pressable
              onPress={() => {
                void Linking.openURL("https://sovereignhope.church/schedule");
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                themedStyles.contentCard,
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={themedStyles.contentCardColumn}>
                <Text style={themedStyles.contentCardHeader}>
                  Church Schedule
                </Text>
                <Text style={themedStyles.text}>
                  View a schedule of all the upcoming events at Sovereign Hope.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={theme.colors.border}
                style={themedStyles.disclosureIcon}
              />
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
