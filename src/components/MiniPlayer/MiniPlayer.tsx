import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  id: string;
}

const jumpBack = async () => {
  const progress = await TrackPlayer.getProgress();
  const currentPosition = progress.position;
  await TrackPlayer.seekTo(currentPosition - 15);
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const jumpForward = async () => {
  const progress = await TrackPlayer.getProgress();
  const currentPosition = progress.position;
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

export const MiniPlayer: React.FunctionComponent<Props> = ({ id }: Props) => {
  // Custom hooks
  const theme = useTheme();
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress();

  // Ref Hooks
  const mountAnimation = useRef(new Animated.Value(1000)).current;

  // State hooks
  const [isPlaybackEnded, setIsPlaybackEnded] = useState<boolean>(true);
  const [isPlayerOffscreen, setIsPlayerOffscreen] = useState<boolean>(true);
  const [track, setTrack] = useState<Track | null>();

  useTrackPlayerEvents(
    [
      Event.PlaybackQueueEnded,
      Event.PlaybackActiveTrackChanged,
      Event.RemoteStop,
      Event.PlaybackState,
      Event.PlaybackError,
      Event.MetadataCommonReceived,
    ],
    (event) => {
      TrackPlayer.getTrack(0)
        .then((currentTrack) => {
          setTrack(currentTrack);
          return;
        })
        .catch((error) => {
          console.log(error);
        });

      if (event.type === Event.PlaybackError) {
        console.error("An error occured while playing the current track.");
      }
      if (event.type === Event.PlaybackQueueEnded) {
        // This doesn't ever seem to fire?
        setIsPlaybackEnded(true);
      }
      if (
        event.type === Event.PlaybackState &&
        (playbackState.state === State.Playing ||
          playbackState.state === State.Buffering ||
          playbackState.state === State.Loading)
      ) {
        setIsPlaybackEnded(false);
      }
    }
  );

  // Effect hooks

  useLayoutEffect(() => {
    const umountTiming = Animated.timing(mountAnimation, {
      toValue: 1000,
      duration: 500,
      useNativeDriver: true,
    });
    const mountTiming = Animated.timing(mountAnimation, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    });
    if (isPlaybackEnded && !isPlayerOffscreen) {
      mountTiming.stop();
      umountTiming.start(({ finished }) => {
        if (finished) {
          setIsPlayerOffscreen(true);
        }
      });
    } else if (!isPlaybackEnded) {
      setIsPlayerOffscreen(false);
      umountTiming.stop();
      mountTiming.start();
    }
  }, [isPlaybackEnded, track]);

  // Event handlers
  const stopPlayback = () => {
    // await TrackPlayer.reset();
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
      id={id}
      style={[
        themedStyles.player,
        {
          transform: [
            {
              translateY: mountAnimation,
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
            indeterminate={playbackState.state === State.Buffering}
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
        {playbackState.state === State.Playing ? (
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
