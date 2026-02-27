import React, {
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Animated,
  Pressable,
  Text,
  View,
  Modal,
  Image,
  Platform,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./MediaPlayer.styles";
import TrackPlayer, {
  Event,
  State as PlayerState,
  Track,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
  RepeatMode as TrackPlayerRepeatMode,
} from "react-native-track-player";
import { colors } from "src/style/colors";
import * as Haptics from "expo-haptics";
import { formatTime } from "./utils";
import { TabBarHeightContext } from "src/navigation/TabBarContext";
import { MediaPlayerContext } from "src/navigation/MediaPlayerContext";

interface Props {
  id: string;
}

type PlayerMode = "minimized" | "maximized";
type RepeatMode = "off" | "track" | "queue";

// Media Player Component
export const MediaPlayer: React.FunctionComponent<Props> = () => {
  // Custom hooks
  const insets = useSafeAreaInsets();
  const {
    height: tabBarHeight,
    measuredHeight,
    cachedHeight,
    isCached,
    isTabBarVisible,
  } = React.useContext(TabBarHeightContext);
  const { setIsVisible } = React.useContext(MediaPlayerContext);
  const playbackState = usePlaybackState();

  // Calculate dynamic bottom offset for Android
  const getBottomOffset = useCallback(() => {
    const desiredGap = 6; // pixels of visible gap between player and tab bar

    // Use visibility state for immediate positioning
    if (!isTabBarVisible) {
      // Tab bar is hidden, sit at the very bottom
      return insets.bottom + desiredGap;
    }

    // Tab bar is visible, use cached height for immediate positioning
    const effectiveTabBarHeight = isCached
      ? cachedHeight
      : tabBarHeight || measuredHeight;

    // When the tab bar is visible, keep a small gap above it

    if (Platform.OS === "android") {
      return effectiveTabBarHeight + desiredGap;
    }
    // iOS: use safe area bottom + small gap above tab bar
    return effectiveTabBarHeight + desiredGap;
  }, [
    isTabBarVisible,
    tabBarHeight,
    measuredHeight,
    cachedHeight,
    isCached,
    insets.bottom,
  ]);

  const { position, duration } = useProgress();

  // Memoize progress to prevent unnecessary re-renders
  // const progress = useMemo(() => {
  //   return position > 0 && duration > 0 ? position / duration : 0;
  // }, [position, duration]);

  const formattedPosition = useMemo(() => formatTime(position), [position]);
  const formattedDuration = useMemo(() => formatTime(duration), [duration]);

  // Ref Hooks
  const mountAnimation = useRef(new Animated.Value(0)).current;
  const bottomAnimation = useRef(new Animated.Value(0)).current;

  // State hooks
  const [isPlayerOffscreen, setIsPlayerOffscreen] = useState<boolean>(true);
  const [track, setTrack] = useState<Track | undefined>();
  const [playerMode, setPlayerMode] = useState<PlayerMode>("minimized");
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [miniScrubberWidth, setMiniScrubberWidth] = useState<number>(0);
  const [maxScrubberWidth, setMaxScrubberWidth] = useState<number>(0);
  const [visualPosition, setVisualPosition] = useState<number>(0);
  const [seekTarget, setSeekTarget] = useState<number | undefined>();
  const visualPositionRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Update visibility state when track changes
  React.useEffect(() => {
    setIsVisible(track !== undefined);
  }, [track, setIsVisible]);

  // Update visual position when not dragging and no seek target
  React.useEffect(() => {
    if (!isDraggingRef.current && seekTarget === undefined) {
      setVisualPosition(position);
      visualPositionRef.current = position;
    }
  }, [position, isDragging, seekTarget]);

  // Clear seek target when position catches up
  React.useEffect(() => {
    if (seekTarget !== undefined && Math.abs(position - seekTarget) < 0.5) {
      setSeekTarget(undefined);
    }
  }, [position, seekTarget]);

  // Track player events
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
          setTrack(currentTrack || undefined);
          return;
        })
        .catch((error) => {
          console.log(error);
        });

      if (event.type === Event.PlaybackError) {
        console.error("An error occurred while playing the current track.");
      }
      if (event.type === Event.PlaybackState) {
        // Handle playback state changes if needed
      }
    }
  );

  // Animation effects
  useLayoutEffect(() => {
    // Calculate the distance needed to slide completely off-screen
    const MINI_HEIGHT = 80;
    const slideDistance = MINI_HEIGHT + 120; // much further off-screen for smooth disappearance

    const unmountTiming = Animated.timing(mountAnimation, {
      toValue: slideDistance, // move completely off-screen
      duration: 250,
      useNativeDriver: true,
    });
    const mountTiming = Animated.timing(mountAnimation, {
      toValue: 0, // rest position
      duration: 250,
      useNativeDriver: true,
    });

    // Only animate when track changes from undefined to a track (or vice versa)
    if (track === undefined && !isPlayerOffscreen) {
      // Track was removed, animate out
      mountTiming.stop();
      unmountTiming.start(({ finished }) => {
        if (finished) {
          setIsPlayerOffscreen(true);
          setIsModalVisible(false);
        }
      });
    } else if (track !== undefined && isPlayerOffscreen) {
      // Track was added, animate in from off-screen
      setIsPlayerOffscreen(false);
      unmountTiming.stop();
      // Always start from off-screen position
      mountAnimation.setValue(slideDistance);
      mountTiming.start();
    }
  }, [track, isPlayerOffscreen, mountAnimation]);

  // Animate bottom position when tab bar height changes
  useLayoutEffect(() => {
    const newBottomOffset = getBottomOffset();

    // Start animation immediately
    Animated.timing(bottomAnimation, {
      toValue: -newBottomOffset, // Negative because we're using translateY
      duration: 50,
      useNativeDriver: true,
    }).start();
  }, [
    tabBarHeight,
    measuredHeight,
    insets.bottom,
    getBottomOffset,
    bottomAnimation,
  ]);

  // Force animation when tab bar visibility changes (immediate navigation response)
  useLayoutEffect(() => {
    const newBottomOffset = getBottomOffset();

    Animated.timing(bottomAnimation, {
      toValue: -newBottomOffset,
      duration: 50,
      useNativeDriver: true,
    }).start();
  }, [isTabBarVisible, getBottomOffset, bottomAnimation]);

  // Event handlers
  const stopPlayback = useCallback(async () => {
    await TrackPlayer.reset();
    setPlayerMode("minimized");
    setIsModalVisible(false);
    setIsToggling(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const jumpBack = useCallback(async () => {
    const progress = await TrackPlayer.getProgress();
    const currentPosition = progress.position;
    await TrackPlayer.seekTo(currentPosition - 15);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const jumpForward = useCallback(async () => {
    const progress = await TrackPlayer.getProgress();
    const currentPosition = progress.position;
    await TrackPlayer.seekTo(currentPosition + 15);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const play = useCallback(async () => {
    await TrackPlayer.play();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const togglePlayerMode = useCallback(() => {
    if (isToggling) return;

    setIsToggling(true);

    if (playerMode === "minimized" && !isModalVisible) {
      setPlayerMode("maximized");
      setIsModalVisible(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (playerMode === "maximized" && isModalVisible) {
      setPlayerMode("minimized");
      setIsModalVisible(false);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Reset toggling state after a short delay
    setTimeout(() => {
      setIsToggling(false);
    }, 300);
  }, [isToggling, playerMode, isModalVisible]);

  const toggleRepeatMode = useCallback(async () => {
    const nextMode: RepeatMode = repeatMode === "off" ? "track" : "off";
    setRepeatMode(nextMode);

    await TrackPlayer.setRepeatMode(
      nextMode === "off"
        ? TrackPlayerRepeatMode.Off
        : TrackPlayerRepeatMode.Track
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [repeatMode]);

  const changePlaybackRate = useCallback(async (rate: number) => {
    setPlaybackRate(rate);
    await TrackPlayer.setRate(rate);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Replace track-skip handlers (next/previous) with long seek +/-60s
  const skipToNext = useCallback(async () => {
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(progress.position + 60);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const skipToPrevious = useCallback(async () => {
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(0, progress.position - 60));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const seekToPosition = useCallback(async (position: number) => {
    setSeekTarget(position);
    await TrackPlayer.seekTo(position);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleScrubberGesture = useCallback(
    (event: { nativeEvent: { translationX: number; state: number } }) => {
      const currentWidth = isModalVisible
        ? maxScrubberWidth
        : miniScrubberWidth;
      if (currentWidth === 0 || duration === 0) return;

      const { translationX, state } = event.nativeEvent;

      switch (state) {
        case State.ACTIVE: {
          setIsDragging(true);
          visualPositionRef.current = position;
          // Update position immediately for Android responsiveness
          const progress = Math.max(
            0,
            Math.min(
              1,
              (translationX + (position / duration) * currentWidth) /
                currentWidth
            )
          );
          const newPosition = progress * duration;
          setVisualPosition(newPosition);
          break;
        }
        case State.BEGAN: {
          // Also handle BEGAN state for better Android support
          setIsDragging(true);
          visualPositionRef.current = position;
          break;
        }
        case State.END: {
          const endProgress = Math.max(
            0,
            Math.min(
              1,
              (translationX +
                (visualPositionRef.current / duration) * currentWidth) /
                currentWidth
            )
          );
          const seekPosition = endProgress * duration;
          setVisualPosition(seekPosition);
          setIsDragging(false);
          void seekToPosition(seekPosition);
          break;
        }
      }
    },
    [
      miniScrubberWidth,
      maxScrubberWidth,
      duration,
      position,
      seekToPosition,
      isModalVisible,
    ]
  );

  const handleScrubberGestureEvent = useCallback(
    (event: { nativeEvent: { translationX: number } }) => {
      const currentWidth = isModalVisible
        ? maxScrubberWidth
        : miniScrubberWidth;
      if (currentWidth === 0 || duration === 0 || !isDragging) return;

      const { translationX } = event.nativeEvent;

      // Calculate position based on translation from start position
      const progress = Math.max(
        0,
        Math.min(
          1,
          (translationX +
            (visualPositionRef.current / duration) * currentWidth) /
            currentWidth
        )
      );
      const newPosition = progress * duration;
      setVisualPosition(newPosition);
    },
    [isDragging, duration, miniScrubberWidth, maxScrubberWidth, isModalVisible]
  );

  const handleScrubberPress = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      const currentWidth = isModalVisible
        ? maxScrubberWidth
        : miniScrubberWidth;
      if (currentWidth === 0 || duration === 0) return;

      const { locationX } = event.nativeEvent;
      const progress = Math.max(0, Math.min(1, locationX / currentWidth));
      const seekPosition = progress * duration;
      void seekToPosition(seekPosition);
    },
    [
      miniScrubberWidth,
      maxScrubberWidth,
      duration,
      seekToPosition,
      isModalVisible,
    ]
  );

  // Touch handlers for full-screen player
  const handleTouchStart = useCallback(() => {
    if (maxScrubberWidth === 0 || duration === 0) return;

    setIsDragging(true);
    visualPositionRef.current = position;
  }, [maxScrubberWidth, duration, position]);

  const handleTouchMove = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      if (maxScrubberWidth === 0 || duration === 0 || !isDragging) return;

      const { locationX } = event.nativeEvent;
      const progress = Math.max(0, Math.min(1, locationX / maxScrubberWidth));
      const newPosition = progress * duration;

      // Always update during drag - the threshold was causing issues
      setVisualPosition(newPosition);
    },
    [maxScrubberWidth, duration, isDragging]
  );

  const handleTouchEnd = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      if (maxScrubberWidth === 0 || duration === 0 || !isDragging) return;

      const { locationX } = event.nativeEvent;
      const progress = Math.max(0, Math.min(1, locationX / maxScrubberWidth));
      const seekPosition = progress * duration;

      setVisualPosition(seekPosition);
      setIsDragging(false);
      void seekToPosition(seekPosition);
    },
    [maxScrubberWidth, duration, isDragging, seekToPosition]
  );

  // Helper function to get safe image source
  const getImageSource = useCallback((artwork: unknown) => {
    if (!artwork) return;

    // Handle different artwork formats
    if (typeof artwork === "string") {
      return { uri: artwork };
    }

    if (typeof artwork === "object" && artwork !== null && "uri" in artwork) {
      return { uri: (artwork as { uri: string }).uri };
    }

    return;
  }, []);

  // Constants
  const themedStyles = styles();

  if (isPlayerOffscreen) {
    return;
  }

  return (
    <>
      <Animated.View
        style={[
          themedStyles.minimizedPlayer,
          {
            bottom: 0, // Always at bottom, use translateY for positioning
            transform: [
              {
                translateY: Animated.add(mountAnimation, bottomAnimation),
              },
            ],
          },
        ]}
      >
        <View style={themedStyles.minimizedContent}>
          <Pressable
            onPress={togglePlayerMode}
            style={themedStyles.minimizedTrackInfo}
            accessibilityRole="button"
            accessibilityLabel="Open player"
            accessibilityHint="Tap to open the full media player"
          >
            <View style={themedStyles.trackImageContainer}>
              {getImageSource(track?.artwork) ? (
                <Image
                  source={getImageSource(track?.artwork) as { uri: string }}
                  style={themedStyles.trackImage}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={themedStyles.trackImagePlaceholder}>
                  <Ionicons
                    name="musical-notes"
                    size={20}
                    color={colors.white}
                  />
                </View>
              )}
            </View>
            <View style={themedStyles.trackDetails}>
              <Text style={themedStyles.trackTitle} numberOfLines={1}>
                {track?.title || "Unknown Track"}
              </Text>
              <Text style={themedStyles.trackArtist} numberOfLines={1}>
                {track?.artist || "Unknown Artist"}
              </Text>
            </View>
          </Pressable>

          <View style={themedStyles.minimizedControls}>
            <Pressable
              onPress={() =>
                void (playbackState.state === PlayerState.Playing
                  ? pause()
                  : play())
              }
              style={themedStyles.minimizedPlayButton}
              accessibilityRole="button"
              accessibilityLabel={
                playbackState.state === PlayerState.Playing ? "Pause" : "Play"
              }
              accessibilityHint="Tap to play or pause the current track"
            >
              <Ionicons
                name={
                  playbackState.state === PlayerState.Playing ? "pause" : "play"
                }
                size={24}
                color={colors.white}
              />
            </Pressable>
            <Pressable
              onPress={() => void stopPlayback()}
              style={themedStyles.minimizedCloseButton}
              accessibilityRole="button"
              accessibilityLabel="Stop playback"
              accessibilityHint="Tap to stop the current track"
            >
              <Ionicons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>
        </View>

        <View style={themedStyles.minimizedProgressBar}>
          <View
            style={themedStyles.minimizedProgressBarContainer}
            onLayout={(event) => {
              const { width } = event.nativeEvent.layout;
              setMiniScrubberWidth(width);
            }}
          >
            <Pressable
              onPress={handleScrubberPress}
              style={themedStyles.minimizedScrubberTrack}
              hitSlop={{ top: 20, bottom: 20, left: 0, right: 0 }}
              accessibilityRole="button"
              accessibilityLabel="Progress bar"
              accessibilityHint="Tap to seek to a position in the track"
            >
              <PanGestureHandler
                onHandlerStateChange={handleScrubberGesture}
                onGestureEvent={handleScrubberGestureEvent}
                activeOffsetX={[-5, 5]}
                failOffsetY={[-30, 30]}
                shouldCancelWhenOutside={false}
                minDist={0}
                enableTrackpadTwoFingerGesture={false}
                avgTouches={true}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <View style={themedStyles.minimizedScrubberTrack}>
                  <View
                    style={[
                      themedStyles.minimizedScrubberProgress,
                      {
                        width: `${(visualPosition / duration) * 100}%`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      themedStyles.minimizedScrubberHandle,
                      {
                        left: `${(visualPosition / duration) * 100}%`,
                      },
                    ]}
                  />
                </View>
              </PanGestureHandler>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsModalVisible(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View style={themedStyles.maximizedContainer}>
          <View
            style={[themedStyles.maximizedHeader, { paddingTop: insets.top }]}
          >
            <Pressable
              onPress={togglePlayerMode}
              style={themedStyles.maximizedCloseButton}
              accessibilityRole="button"
              accessibilityLabel="Close player"
              accessibilityHint="Tap to minimize the player"
            >
              <Ionicons name="chevron-down" size={28} color={colors.white} />
            </Pressable>
            <Text style={themedStyles.maximizedTitle}>Now Playing</Text>
            <Pressable
              onPress={() => void stopPlayback()}
              style={themedStyles.maximizedStopButton}
              accessibilityRole="button"
              accessibilityLabel="Stop playback"
              accessibilityHint="Tap to stop the current track"
            >
              <Ionicons name="stop" size={24} color={colors.white} />
            </Pressable>
          </View>

          <View style={themedStyles.maximizedContent}>
            <View style={themedStyles.maximizedTrackSection}>
              <View style={themedStyles.maximizedTrackImageContainer}>
                {getImageSource(track?.artwork) ? (
                  <Image
                    source={getImageSource(track?.artwork) as { uri: string }}
                    style={themedStyles.maximizedTrackImage}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <View style={themedStyles.maximizedTrackImagePlaceholder}>
                    <Ionicons
                      name="musical-notes"
                      size={60}
                      color={colors.white}
                    />
                  </View>
                )}
              </View>

              <View style={themedStyles.maximizedTrackInfo}>
                <Text style={themedStyles.maximizedTrackTitle}>
                  {track?.title || "Unknown Track"}
                </Text>
                <Text style={themedStyles.maximizedTrackArtist}>
                  {track?.artist || "Unknown Artist"}
                </Text>
                <Text style={themedStyles.maximizedTrackAlbum}>
                  {track?.album || "Unknown Album"}
                </Text>
              </View>
            </View>

            <View style={themedStyles.maximizedProgressSection}>
              <View style={themedStyles.maximizedProgressBar}>
                <View
                  style={themedStyles.maximizedProgressBarContainer}
                  onLayout={(event) => {
                    const { width } = event.nativeEvent.layout;
                    setMaxScrubberWidth(width);
                  }}
                >
                  {Platform.OS === "ios" ? (
                    <Pressable
                      onPress={handleScrubberPress}
                      style={themedStyles.maximizedScrubberTrack}
                      hitSlop={{ top: 20, bottom: 20, left: 0, right: 0 }}
                      accessibilityRole="button"
                      accessibilityLabel="Progress bar"
                      accessibilityHint="Tap to seek to a position in the track"
                    >
                      <PanGestureHandler
                        onHandlerStateChange={handleScrubberGesture}
                        onGestureEvent={handleScrubberGestureEvent}
                        activeOffsetX={[-5, 5]}
                        failOffsetY={[-30, 30]}
                        shouldCancelWhenOutside={false}
                        minDist={0}
                        enableTrackpadTwoFingerGesture={false}
                        avgTouches={true}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                      >
                        <View style={themedStyles.maximizedScrubberTrack}>
                          <View
                            style={[
                              themedStyles.maximizedScrubberProgress,
                              {
                                width: `${(visualPosition / duration) * 100}%`,
                              },
                            ]}
                          />
                          <View
                            style={[
                              themedStyles.maximizedScrubberHandle,
                              {
                                left: `${(visualPosition / duration) * 100}%`,
                              },
                            ]}
                          />
                        </View>
                      </PanGestureHandler>
                    </Pressable>
                  ) : (
                    <View
                      style={themedStyles.maximizedScrubberTrack}
                      onStartShouldSetResponder={() => true}
                      onMoveShouldSetResponder={() => true}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      accessibilityRole="button"
                      accessibilityLabel="Progress bar"
                      accessibilityHint="Tap to seek to a position in the track"
                    >
                      <View
                        style={[
                          themedStyles.maximizedScrubberProgress,
                          {
                            width: `${(visualPosition / duration) * 100}%`,
                          },
                        ]}
                      />
                      <View
                        style={[
                          themedStyles.maximizedScrubberHandle,
                          {
                            left: `${(visualPosition / duration) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>
            <View style={themedStyles.maximizedTimeContainer}>
              <Text style={themedStyles.maximizedTimeText}>
                {formattedPosition}
              </Text>
              <Text style={themedStyles.maximizedTimeText}>
                {formattedDuration}
              </Text>
            </View>
          </View>

          <View style={themedStyles.maximizedControls}>
            <View style={themedStyles.maximizedSecondaryControls}>
              {/* Removed shuffle */}
              <Pressable
                onPress={() => void skipToPrevious()}
                style={themedStyles.maximizedSecondaryButton}
                accessibilityRole="button"
                accessibilityLabel="Skip back 1 minute"
                accessibilityHint="Tap to skip back 1 minute in the track"
              >
                <View style={themedStyles.maximizedButtonWithLabel}>
                  <Ionicons
                    name="return-down-back"
                    size={24}
                    color={colors.white}
                  />
                  <Text style={themedStyles.maximizedButtonLabel}>-1m</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => void jumpBack()}
                style={themedStyles.maximizedSecondaryButton}
                accessibilityRole="button"
                accessibilityLabel="Jump back 15 seconds"
                accessibilityHint="Tap to jump back 15 seconds in the track"
              >
                <View style={themedStyles.maximizedButtonWithLabel}>
                  <Ionicons name="play-back" size={24} color={colors.white} />
                  <Text style={themedStyles.maximizedButtonLabel}>-15s</Text>
                </View>
              </Pressable>
            </View>

            <View style={themedStyles.maximizedMainControls}>
              <Pressable
                onPress={() =>
                  void (playbackState.state === PlayerState.Playing
                    ? pause()
                    : play())
                }
                style={themedStyles.maximizedPlayButton}
                accessibilityRole="button"
                accessibilityLabel={
                  playbackState.state === PlayerState.Playing ? "Pause" : "Play"
                }
                accessibilityHint="Tap to play or pause the current track"
              >
                <Ionicons
                  name={
                    playbackState.state === PlayerState.Playing
                      ? "pause"
                      : "play"
                  }
                  size={48}
                  color={colors.white}
                />
              </Pressable>
            </View>

            <View style={themedStyles.maximizedSecondaryControls}>
              <Pressable
                onPress={() => void jumpForward()}
                style={themedStyles.maximizedSecondaryButton}
                accessibilityRole="button"
                accessibilityLabel="Jump forward 15 seconds"
                accessibilityHint="Tap to jump forward 15 seconds in the track"
              >
                <View style={themedStyles.maximizedButtonWithLabel}>
                  <Ionicons
                    name="play-forward"
                    size={24}
                    color={colors.white}
                  />
                  <Text style={themedStyles.maximizedButtonLabel}>+15s</Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => void skipToNext()}
                style={themedStyles.maximizedSecondaryButton}
                accessibilityRole="button"
                accessibilityLabel="Skip forward 1 minute"
                accessibilityHint="Tap to skip forward 1 minute in the track"
              >
                <View style={themedStyles.maximizedButtonWithLabel}>
                  <Ionicons
                    name="return-down-forward"
                    size={24}
                    color={colors.white}
                  />
                  <Text style={themedStyles.maximizedButtonLabel}>+1m</Text>
                </View>
              </Pressable>
            </View>
          </View>

          <View style={themedStyles.maximizedPlaybackRateSection}>
            <Text style={themedStyles.maximizedSectionTitle}>
              Playback Speed
            </Text>
            <View style={themedStyles.maximizedPlaybackRateButtons}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <Pressable
                  key={rate}
                  onPress={() => void changePlaybackRate(rate)}
                  style={[
                    themedStyles.maximizedPlaybackRateButton,
                    playbackRate === rate &&
                      themedStyles.maximizedPlaybackRateButtonActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Playback rate ${rate}x`}
                  accessibilityHint="Tap to change playback speed"
                >
                  <Text
                    style={[
                      themedStyles.maximizedPlaybackRateText,
                      playbackRate === rate &&
                        themedStyles.maximizedPlaybackRateTextActive,
                    ]}
                  >
                    {rate}x
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={themedStyles.maximizedPlaybackOptionsSection}>
            <Text style={themedStyles.maximizedSectionTitle}>
              Playback Options
            </Text>
            <View style={themedStyles.maximizedPlaybackOptionsButtons}>
              <Pressable
                onPress={() => void toggleRepeatMode()}
                style={[
                  themedStyles.maximizedPlaybackOptionButton,
                  repeatMode !== "off" &&
                    themedStyles.maximizedPlaybackOptionButtonActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  repeatMode === "track" ? "Repeat track on" : "Repeat off"
                }
                accessibilityHint="Tap to toggle repeat mode"
              >
                <Ionicons
                  name={repeatMode === "track" ? "repeat" : "repeat-outline"}
                  size={20}
                  color={colors.white}
                />
                <Text style={themedStyles.maximizedPlaybackOptionLabel}>
                  {repeatMode === "track" ? "Repeat Track" : "Repeat Off"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
