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
  DynamicColorIOS,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabletLayout } from "src/hooks/useTabletLayout";
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
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import {
  pauseMemoryAudioSession,
  resumeMemoryAudioSession,
  seekMemoryAudioSession,
  selectMemoryAudioState,
  stopMemoryAudioSession,
} from "src/redux/memoryAudioSlice";
import {
  MEMORY_AUDIO_SESSION_TRACK_TITLE,
  MEMORY_AUDIO_SESSION_TRACK_ARTIST,
  MEMORY_AUDIO_SESSION_TRACK_ALBUM,
  MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI,
  getEstimatedMemoryAudioSessionDurationSeconds,
} from "src/services/memoryAudioConstants";
import { canUseLiquidGlass } from "src/services/liquidGlassSupport";
import { spacing } from "src/style/layout";

interface Props {
  id: string;
}

type PlayerMode = "minimized" | "maximized";
type RepeatMode = "off" | "track" | "queue";

const MAX_MINI_PLAYER_WIDTH = 720;

// Media Player Component
export const MediaPlayer: React.FunctionComponent<Props> = () => {
  // Custom hooks
  const dispatch = useAppDispatch();
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
  const memoryAudioState = useAppSelector(selectMemoryAudioState);
  const { width: viewportWidth, isTablet } = useTabletLayout();

  const useExpandedPlayerSheet = isTablet;
  const minimizedBaseInset =
    Platform.OS === "ios" ? spacing.large : spacing.medium;
  const minimizedHorizontalInset = React.useMemo(() => {
    const maxInset = Math.max(
      minimizedBaseInset,
      (viewportWidth - MAX_MINI_PLAYER_WIDTH) / 2
    );

    return Math.round(maxInset);
  }, [minimizedBaseInset, viewportWidth]);

  // Calculate dynamic bottom offset for Android
  const getBottomOffset = useCallback(() => {
    const desiredGap = 6; // pixels of visible gap between player and tab bar
    const isIPad = Platform.OS === "ios" && Platform.isPad;

    // Use visibility state for immediate positioning
    if (!isTabBarVisible) {
      // Tab bar is hidden, sit at the very bottom
      return insets.bottom + desiredGap;
    }

    // Tab bar is visible, use cached height for immediate positioning
    const effectiveTabBarHeight = isCached
      ? cachedHeight
      : tabBarHeight || measuredHeight;

    // On iPad, tabs are presented at the top, so there is no bottom tab bar
    // to clear and we should only respect bottom safe area.
    if (isIPad) {
      return insets.bottom + desiredGap;
    }

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
  const [maxScrubberWidth, setMaxScrubberWidth] = useState<number>(0);
  const [visualPosition, setVisualPosition] = useState<number>(0);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState<number>(0);
  const [seekTarget, setSeekTarget] = useState<number | undefined>();
  const visualPositionRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const pausedAtMsRef = useRef<number>(Number.NaN);
  const totalPausedMsRef = useRef<number>(0);
  const lastSessionStartedAtRef = useRef<number>(Number.NaN);

  const isMemorySessionActiveTrack = memoryAudioState.isMemorySessionActive;
  const isMemorySessionPlaying = isMemorySessionActiveTrack
    ? !memoryAudioState.isSessionPaused
    : playbackState.state === PlayerState.Playing;
  const memoryVerseDurationSeconds =
    memoryAudioState.spokenDurationSeconds > 0
      ? memoryAudioState.spokenDurationSeconds
      : duration;
  const estimatedSessionDuration = useMemo(
    () =>
      getEstimatedMemoryAudioSessionDurationSeconds(
        memoryVerseDurationSeconds,
        memoryAudioState.recallCyclesTarget
      ),
    [memoryVerseDurationSeconds, memoryAudioState.recallCyclesTarget]
  );
  const effectiveDuration =
    isMemorySessionActiveTrack && memoryAudioState.sessionDurationSeconds > 0
      ? memoryAudioState.sessionDurationSeconds
      : isMemorySessionActiveTrack && estimatedSessionDuration > 0
      ? estimatedSessionDuration
      : duration;
  const effectivePosition = isMemorySessionActiveTrack
    ? Math.min(sessionElapsedSeconds, effectiveDuration)
    : position;
  const formattedPosition = useMemo(
    () => formatTime(effectivePosition),
    [effectivePosition]
  );
  const formattedDuration = useMemo(
    () => formatTime(effectiveDuration),
    [effectiveDuration]
  );
  const scrubberProgressPercent = useMemo(() => {
    if (effectiveDuration <= 0) {
      return 0;
    }
    return Math.min(100, (visualPosition / effectiveDuration) * 100);
  }, [effectiveDuration, visualPosition]);

  const shouldShowPlayer = track !== undefined || isMemorySessionActiveTrack;
  const shouldUseLiquidGlass = canUseLiquidGlass(Platform.OS, {
    isGlassEffectCheck: isGlassEffectAPIAvailable,
    isLiquidGlassCheck: isLiquidGlassAvailable,
  });
  const miniPrimaryForeground =
    Platform.OS === "ios"
      ? DynamicColorIOS({
          light: "#111319",
          dark: "#FFFFFF",
        })
      : colors.white;
  const miniSecondaryForeground =
    Platform.OS === "ios"
      ? DynamicColorIOS({
          light: "rgba(17, 19, 25, 0.72)",
          dark: "rgba(255, 255, 255, 0.86)",
        })
      : colors.white;
  const maximizedHeaderTopInset = useExpandedPlayerSheet
    ? spacing.medium
    : insets.top;

  // Update visibility state when track or memory session changes
  React.useEffect(() => {
    setIsVisible(shouldShowPlayer);
  }, [shouldShowPlayer, setIsVisible]);

  React.useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  React.useEffect(() => {
    const sessionStartedAt = memoryAudioState.sessionStartedAt;

    if (
      !isMemorySessionActiveTrack ||
      !sessionStartedAt ||
      !memoryAudioState.isMemorySessionActive
    ) {
      pausedAtMsRef.current = Number.NaN;
      totalPausedMsRef.current = 0;
      lastSessionStartedAtRef.current = Number.NaN;
      setSessionElapsedSeconds(0);
      return;
    }

    if (lastSessionStartedAtRef.current !== sessionStartedAt) {
      lastSessionStartedAtRef.current = sessionStartedAt;
      pausedAtMsRef.current = Number.NaN;
      totalPausedMsRef.current = 0;
    }

    if (memoryAudioState.isSessionPaused) {
      if (Number.isNaN(pausedAtMsRef.current)) {
        pausedAtMsRef.current = Date.now();
      }
    } else if (!Number.isNaN(pausedAtMsRef.current)) {
      totalPausedMsRef.current += Date.now() - pausedAtMsRef.current;
      pausedAtMsRef.current = Number.NaN;
    }

    const updateElapsed = () => {
      const now = Date.now();
      const pausedAtMs = pausedAtMsRef.current;
      const currentPauseMs = Number.isNaN(pausedAtMs) ? 0 : now - pausedAtMs;
      const elapsedMs = Math.max(
        0,
        now - sessionStartedAt - totalPausedMsRef.current - currentPauseMs
      );
      setSessionElapsedSeconds(elapsedMs / 1000);
    };

    updateElapsed();
    const intervalId = setInterval(updateElapsed, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    isMemorySessionActiveTrack,
    memoryAudioState.sessionStartedAt,
    memoryAudioState.isMemorySessionActive,
    memoryAudioState.isSessionPaused,
  ]);

  // Update visual position when not dragging and no seek target
  React.useEffect(() => {
    if (!isDraggingRef.current && seekTarget === undefined) {
      setVisualPosition(effectivePosition);
      visualPositionRef.current = effectivePosition;
    }
  }, [effectivePosition, isDragging, seekTarget]);

  // Clear seek target when position catches up
  React.useEffect(() => {
    if (
      seekTarget !== undefined &&
      Math.abs(effectivePosition - seekTarget) < 0.5
    ) {
      setSeekTarget(undefined);
    }
  }, [effectivePosition, seekTarget]);

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
    const MINI_HEIGHT = 56;
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

    // Only animate when player should show/hide
    if (!shouldShowPlayer && !isPlayerOffscreen) {
      // Player should hide, animate out
      mountTiming.stop();
      unmountTiming.start(({ finished }) => {
        if (finished) {
          setIsPlayerOffscreen(true);
          setIsModalVisible(false);
        }
      });
    } else if (shouldShowPlayer && isPlayerOffscreen) {
      // Player should show, animate in from off-screen
      setIsPlayerOffscreen(false);
      unmountTiming.stop();
      // Always start from off-screen position
      mountAnimation.setValue(slideDistance);
      mountTiming.start();
    }
  }, [shouldShowPlayer, isPlayerOffscreen, mountAnimation]);

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
    await (isMemorySessionActiveTrack
      ? dispatch(stopMemoryAudioSession())
      : TrackPlayer.reset());
    setPlayerMode("minimized");
    setIsModalVisible(false);
    setIsToggling(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [dispatch, isMemorySessionActiveTrack]);

  const jumpBack = useCallback(async () => {
    if (isMemorySessionActiveTrack) {
      return;
    }
    const progress = await TrackPlayer.getProgress();
    const currentPosition = progress.position;
    await TrackPlayer.seekTo(currentPosition - 15);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isMemorySessionActiveTrack]);

  const jumpForward = useCallback(async () => {
    if (isMemorySessionActiveTrack) {
      return;
    }
    const progress = await TrackPlayer.getProgress();
    const currentPosition = progress.position;
    await TrackPlayer.seekTo(currentPosition + 15);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isMemorySessionActiveTrack]);

  const play = useCallback(async () => {
    await (isMemorySessionActiveTrack
      ? dispatch(resumeMemoryAudioSession())
      : TrackPlayer.play());
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [dispatch, isMemorySessionActiveTrack]);

  const pause = useCallback(async () => {
    await (isMemorySessionActiveTrack
      ? dispatch(pauseMemoryAudioSession())
      : TrackPlayer.pause());
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [dispatch, isMemorySessionActiveTrack]);

  const togglePlayPause = useCallback(async () => {
    await (isMemorySessionPlaying ? pause() : play());
  }, [isMemorySessionPlaying, pause, play]);

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
    if (isMemorySessionActiveTrack) {
      return;
    }

    const nextMode: RepeatMode = repeatMode === "off" ? "track" : "off";
    setRepeatMode(nextMode);

    await TrackPlayer.setRepeatMode(
      nextMode === "off"
        ? TrackPlayerRepeatMode.Off
        : TrackPlayerRepeatMode.Track
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isMemorySessionActiveTrack, repeatMode]);

  const changePlaybackRate = useCallback(async (rate: number) => {
    setPlaybackRate(rate);
    await TrackPlayer.setRate(rate);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Replace track-skip handlers (next/previous) with long seek +/-60s
  const skipToNext = useCallback(async () => {
    if (isMemorySessionActiveTrack) {
      return;
    }
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(progress.position + 60);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isMemorySessionActiveTrack]);

  const skipToPrevious = useCallback(async () => {
    if (isMemorySessionActiveTrack) {
      return;
    }
    const progress = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(0, progress.position - 60));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isMemorySessionActiveTrack]);

  const seekToPosition = useCallback(
    async (position: number) => {
      setSeekTarget(position);
      await (isMemorySessionActiveTrack
        ? dispatch(seekMemoryAudioSession(position))
        : TrackPlayer.seekTo(position));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [dispatch, isMemorySessionActiveTrack]
  );

  const handleScrubberGesture = useCallback(
    (event: { nativeEvent: { translationX: number; state: number } }) => {
      const currentWidth = maxScrubberWidth;
      if (currentWidth === 0 || effectiveDuration === 0) return;

      const { translationX, state } = event.nativeEvent;

      switch (state) {
        case State.ACTIVE: {
          setIsDragging(true);
          visualPositionRef.current = effectivePosition;
          // Update position immediately for Android responsiveness
          const progress = Math.max(
            0,
            Math.min(
              1,
              (translationX +
                (effectivePosition / effectiveDuration) * currentWidth) /
                currentWidth
            )
          );
          const newPosition = progress * effectiveDuration;
          setVisualPosition(newPosition);
          break;
        }
        case State.BEGAN: {
          // Also handle BEGAN state for better Android support
          setIsDragging(true);
          visualPositionRef.current = effectivePosition;
          break;
        }
        case State.END: {
          const endProgress = Math.max(
            0,
            Math.min(
              1,
              (translationX +
                (visualPositionRef.current / effectiveDuration) *
                  currentWidth) /
                currentWidth
            )
          );
          const seekPosition = endProgress * effectiveDuration;
          setVisualPosition(seekPosition);
          setIsDragging(false);
          void seekToPosition(seekPosition);
          break;
        }
      }
    },
    [maxScrubberWidth, effectiveDuration, effectivePosition, seekToPosition]
  );

  const handleScrubberGestureEvent = useCallback(
    (event: { nativeEvent: { translationX: number } }) => {
      const currentWidth = maxScrubberWidth;
      if (currentWidth === 0 || effectiveDuration === 0 || !isDragging) return;

      const { translationX } = event.nativeEvent;

      // Calculate position based on translation from start position
      const progress = Math.max(
        0,
        Math.min(
          1,
          (translationX +
            (visualPositionRef.current / effectiveDuration) * currentWidth) /
            currentWidth
        )
      );
      const newPosition = progress * effectiveDuration;
      setVisualPosition(newPosition);
    },
    [isDragging, effectiveDuration, maxScrubberWidth]
  );

  const handleScrubberPress = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      const currentWidth = maxScrubberWidth;
      if (currentWidth === 0 || effectiveDuration === 0) return;

      const { locationX } = event.nativeEvent;
      const progress = Math.max(0, Math.min(1, locationX / currentWidth));
      const seekPosition = progress * effectiveDuration;
      void seekToPosition(seekPosition);
    },
    [maxScrubberWidth, effectiveDuration, seekToPosition]
  );

  // Touch handlers for full-screen player
  const handleTouchStart = useCallback(() => {
    if (maxScrubberWidth === 0 || effectiveDuration === 0) {
      return;
    }

    setIsDragging(true);
    visualPositionRef.current = effectivePosition;
  }, [maxScrubberWidth, effectiveDuration, effectivePosition]);

  const handleTouchMove = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      if (maxScrubberWidth === 0 || effectiveDuration === 0 || !isDragging) {
        return;
      }

      const { locationX } = event.nativeEvent;
      const progress = Math.max(0, Math.min(1, locationX / maxScrubberWidth));
      const newPosition = progress * effectiveDuration;

      // Always update during drag - the threshold was causing issues
      setVisualPosition(newPosition);
    },
    [maxScrubberWidth, effectiveDuration, isDragging]
  );

  const handleTouchEnd = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      if (maxScrubberWidth === 0 || effectiveDuration === 0 || !isDragging) {
        return;
      }

      const { locationX } = event.nativeEvent;
      const progress = Math.max(0, Math.min(1, locationX / maxScrubberWidth));
      const seekPosition = progress * effectiveDuration;

      setVisualPosition(seekPosition);
      setIsDragging(false);
      void seekToPosition(seekPosition);
    },
    [maxScrubberWidth, effectiveDuration, isDragging, seekToPosition]
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
            left: minimizedHorizontalInset,
            right: minimizedHorizontalInset,
          },
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
        {Platform.OS === "ios" ? (
          <>
            {shouldUseLiquidGlass ? (
              <GlassView
                style={themedStyles.minimizedGlassBlur}
                glassEffectStyle="regular"
                colorScheme="auto"
                isInteractive={false}
                pointerEvents="none"
              />
            ) : (
              <BlurView
                style={themedStyles.minimizedGlassBlur}
                tint="systemUltraThinMaterialDark"
                intensity={100}
                pointerEvents="none"
              />
            )}
            {shouldUseLiquidGlass ? undefined : (
              <View
                style={themedStyles.minimizedGlassOverlay}
                pointerEvents="none"
              />
            )}
          </>
        ) : undefined}
        <View style={themedStyles.minimizedContent}>
          <Pressable
            onPress={togglePlayerMode}
            style={themedStyles.minimizedTrackInfo}
            accessibilityRole="button"
            accessibilityLabel="Open player"
            accessibilityHint="Tap to open the full media player"
          >
            <View style={themedStyles.trackImageContainer}>
              {getImageSource(
                track?.artwork ??
                  (isMemorySessionActiveTrack
                    ? MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI
                    : undefined)
              ) ? (
                <Image
                  source={
                    getImageSource(
                      track?.artwork ??
                        (isMemorySessionActiveTrack
                          ? MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI
                          : undefined)
                    ) as { uri: string }
                  }
                  style={themedStyles.trackImage}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={themedStyles.trackImagePlaceholder}>
                  <Ionicons
                    name="musical-notes"
                    size={16}
                    color={miniPrimaryForeground}
                  />
                </View>
              )}
            </View>
            <View style={themedStyles.trackDetails}>
              <Text
                style={[
                  themedStyles.trackTitle,
                  { color: miniPrimaryForeground },
                ]}
                numberOfLines={1}
              >
                {track?.title ??
                  (isMemorySessionActiveTrack
                    ? MEMORY_AUDIO_SESSION_TRACK_TITLE
                    : "Unknown Track")}
              </Text>
              <Text
                style={[
                  themedStyles.trackArtist,
                  { color: miniSecondaryForeground },
                ]}
                numberOfLines={1}
              >
                {track?.artist ??
                  (isMemorySessionActiveTrack
                    ? MEMORY_AUDIO_SESSION_TRACK_ARTIST
                    : "Unknown Artist")}
              </Text>
            </View>
          </Pressable>

          <View style={themedStyles.minimizedControls}>
            <Pressable
              onPress={() => {
                void togglePlayPause();
              }}
              style={themedStyles.minimizedPlayButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={isMemorySessionPlaying ? "Pause" : "Play"}
              accessibilityHint="Tap to play or pause the current track"
            >
              <Ionicons
                name={isMemorySessionPlaying ? "pause" : "play"}
                size={24}
                color={miniPrimaryForeground}
              />
            </Pressable>
            <Pressable
              onPress={() => void stopPlayback()}
              style={themedStyles.minimizedCloseButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Stop playback"
              accessibilityHint="Tap to stop the current track"
            >
              <Ionicons name="close" size={20} color={miniPrimaryForeground} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <Modal
        visible={isModalVisible}
        animationType={useExpandedPlayerSheet ? "fade" : "slide"}
        presentationStyle={
          useExpandedPlayerSheet ? "overFullScreen" : "fullScreen"
        }
        transparent={useExpandedPlayerSheet}
        onRequestClose={() => setIsModalVisible(false)}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <View
          style={[
            themedStyles.maximizedModalRoot,
            useExpandedPlayerSheet && themedStyles.maximizedSheetBackdrop,
          ]}
        >
          {useExpandedPlayerSheet && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close player"
              accessibilityHint="Dismisses the expanded media player."
              onPress={togglePlayerMode}
              style={themedStyles.maximizedSheetBackdropPressable}
            />
          )}
          <View
            style={[
              themedStyles.maximizedContainer,
              useExpandedPlayerSheet && themedStyles.maximizedContainerSheet,
              { paddingBottom: insets.bottom },
            ]}
          >
            {Platform.OS === "ios" ? (
              <>
                {shouldUseLiquidGlass ? (
                  <GlassView
                    style={themedStyles.maximizedGlassBlur}
                    glassEffectStyle="regular"
                    colorScheme="dark"
                    isInteractive={false}
                    pointerEvents="none"
                  />
                ) : (
                  <BlurView
                    style={themedStyles.maximizedGlassBlur}
                    tint="systemMaterialDark"
                    intensity={100}
                    pointerEvents="none"
                  />
                )}
                <View
                  style={themedStyles.maximizedGlassOverlay}
                  pointerEvents="none"
                />
              </>
            ) : undefined}
            <View
              style={[
                themedStyles.maximizedHeader,
                { paddingTop: maximizedHeaderTopInset },
              ]}
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
                  {getImageSource(
                    track?.artwork ??
                      (isMemorySessionActiveTrack
                        ? MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI
                        : undefined)
                  ) ? (
                    <Image
                      source={
                        getImageSource(
                          track?.artwork ??
                            (isMemorySessionActiveTrack
                              ? MEMORY_AUDIO_SESSION_TRACK_ARTWORK_URI
                              : undefined)
                        ) as { uri: string }
                      }
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
                    {track?.title ??
                      (isMemorySessionActiveTrack
                        ? MEMORY_AUDIO_SESSION_TRACK_TITLE
                        : "Unknown Track")}
                  </Text>
                  <Text style={themedStyles.maximizedTrackArtist}>
                    {track?.artist ??
                      (isMemorySessionActiveTrack
                        ? MEMORY_AUDIO_SESSION_TRACK_ARTIST
                        : "Unknown Artist")}
                  </Text>
                  <Text style={themedStyles.maximizedTrackAlbum}>
                    {track?.album ??
                      (isMemorySessionActiveTrack
                        ? MEMORY_AUDIO_SESSION_TRACK_ALBUM
                        : "Unknown Album")}
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
                                  width: `${scrubberProgressPercent}%`,
                                },
                              ]}
                            />
                            <View
                              style={[
                                themedStyles.maximizedScrubberHandle,
                                {
                                  left: `${scrubberProgressPercent}%`,
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
                              width: `${scrubberProgressPercent}%`,
                            },
                          ]}
                        />
                        <View
                          style={[
                            themedStyles.maximizedScrubberHandle,
                            {
                              left: `${scrubberProgressPercent}%`,
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
                  onPress={() => {
                    void togglePlayPause();
                  }}
                  style={themedStyles.maximizedPlayButton}
                  accessibilityRole="button"
                  accessibilityLabel={isMemorySessionPlaying ? "Pause" : "Play"}
                  accessibilityHint="Tap to play or pause the current track"
                >
                  <Ionicons
                    name={isMemorySessionPlaying ? "pause" : "play"}
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
                  disabled={isMemorySessionActiveTrack}
                  style={[
                    themedStyles.maximizedPlaybackOptionButton,
                    repeatMode !== "off" &&
                      themedStyles.maximizedPlaybackOptionButtonActive,
                    isMemorySessionActiveTrack && { opacity: 0.5 },
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
        </View>
      </Modal>
    </>
  );
};
