import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { styles } from "./MiniPlayer.styles";
import TrackPlayer, {
  Event,
  State,
  Track,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from "react-native-track-player";
import { colors } from "src/style/colors";
import * as Haptics from "expo-haptics";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - No types for this package
import Bar from "react-native-progress/Bar";

interface Props {
  track?: Track;
}

const jumpBack = async () => {
  const currentPosition = await TrackPlayer.getPosition();
  await TrackPlayer.seekTo(currentPosition - 15);
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const jumpForward = async () => {
  const currentPosition = await TrackPlayer.getPosition();
  await TrackPlayer.seekTo(currentPosition + 15);
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const play = async () => {
  await TrackPlayer.play();
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const pause = async () => {
  await TrackPlayer.pause();
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// MiniPlayer

export const MiniPlayer: React.FunctionComponent<Props> = ({
  track,
}: Props) => {
  // Custom hooks
  const theme = useTheme();
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress();

  // Ref Hooks
  const mountAnimation = useRef(new Animated.Value(1000)).current;

  // State hooks
  const [isPlaybackEnded, setIsPlaybackEnded] = useState<boolean>(true);
  const [isPlayerOffscreen, setIsPlayerOffscreen] = useState<boolean>(true);

  useTrackPlayerEvents(
    [
      Event.PlaybackQueueEnded,
      Event.PlaybackTrackChanged,
      Event.RemoteStop,
      Event.PlaybackState,
      Event.PlaybackError,
    ],
    (event) => {
      if (event.type === Event.PlaybackError) {
        console.error("An error occured while playing the current track.");
      }
      if (event.type === Event.PlaybackQueueEnded) {
        console.log("playback ended, playback state:", playbackState);
        // This doesn't ever seem to fire?
        setIsPlaybackEnded(true);
      }
      if (event.type === Event.PlaybackState) {
        console.log("playback state changed:", playbackState);
        if (
          playbackState === State.Playing ||
          playbackState === State.Buffering ||
          playbackState === State.Connecting
        ) {
          setIsPlaybackEnded(false);
        }
      }
    }
  );

  // Effect hooks

  useEffect(() => {
    if (isPlaybackEnded && !isPlayerOffscreen) {
      Animated.timing(mountAnimation, {
        toValue: 1000,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setIsPlayerOffscreen(true);
      });
    } else if (!isPlaybackEnded) {
      setIsPlayerOffscreen(false);
      Animated.timing(mountAnimation, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isPlaybackEnded]);

  // Event handlers
  const stopPlayback = async () => {
    await TrackPlayer.reset();
    setIsPlaybackEnded(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Constants
  const themedStyles = styles({ theme });

  if (isPlayerOffscreen) {
    // eslint-disable-next-line unicorn/no-null
    return null;
  }

  return (
    <Animated.View
      style={[
        themedStyles.player,
        {
          transform: [
            {
              translateX: mountAnimation,
            },
          ],
        },
      ]}
    >
      <View style={themedStyles.header}>
        <Text style={themedStyles.title}>{track?.title}</Text>

        <Pressable
          onPress={() => void stopPlayback()}
          accessibilityRole="button"
          style={({ pressed }) => [
            themedStyles.closeIcon,
            {
              backgroundColor: pressed
                ? theme.colors.background
                : theme.colors.card,
            },
          ]}
        >
          <Ionicons name="close" size={24} color={colors.accent} />
        </Pressable>
      </View>
      <View style={themedStyles.progressContainer}>
        <View style={themedStyles.progressBar}>
          <Bar
            progress={position > 0 ? position / duration : 0}
            // eslint-disable-next-line unicorn/no-null
            width={null}
            color={colors.accent}
            indeterminate={playbackState === State.Buffering}
          />
        </View>
        <Text style={themedStyles.progressText}>
          {`${Math.floor(position / 59)}:${
            Math.floor(position % 59) < 10 ? "0" : ""
          }${Math.floor(position % 59)} / ${Math.floor(duration / 59)}:${
            Math.floor(duration % 59) < 10 ? "0" : ""
          }${Math.floor(duration % 59)}`}
        </Text>
      </View>
      <View style={themedStyles.controls}>
        <Pressable
          onPress={() => void jumpBack()}
          accessibilityRole="button"
          style={({ pressed }) => [
            themedStyles.controlIcon,
            {
              backgroundColor: pressed
                ? theme.colors.background
                : theme.colors.card,
            },
          ]}
        >
          <Ionicons name="play-back" size={48} color={colors.accent} />
        </Pressable>
        {playbackState === State.Playing ? (
          <Pressable
            onPress={() => void pause()}
            accessibilityRole="button"
            style={({ pressed }) => [
              themedStyles.controlIcon,
              {
                backgroundColor: pressed
                  ? theme.colors.background
                  : theme.colors.card,
              },
            ]}
          >
            <Ionicons name="pause" size={48} color={colors.accent} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void play()}
            accessibilityRole="button"
            style={({ pressed }) => [
              themedStyles.controlIcon,
              {
                backgroundColor: pressed
                  ? theme.colors.background
                  : theme.colors.card,
              },
            ]}
          >
            <Ionicons name="play" size={48} color={colors.accent} />
          </Pressable>
        )}
        <Pressable
          onPress={() => void jumpForward()}
          accessibilityRole="button"
          style={({ pressed }) => [
            themedStyles.controlIcon,
            {
              backgroundColor: pressed
                ? theme.colors.background
                : theme.colors.card,
            },
          ]}
        >
          <Ionicons name="play-forward" size={48} color={colors.accent} />
        </Pressable>
      </View>
    </Animated.View>
  );
};
