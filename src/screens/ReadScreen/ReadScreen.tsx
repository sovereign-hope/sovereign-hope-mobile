/* eslint-disable react/prop-types */
// Disabling this because of weird behavior with the react/prop-types rule in this file. It isn't recognizing navigation
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  Animated,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { useAppSelector } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { colors } from "src/style/colors";
import { header1, header3 } from "src/style/typography";
import { Ionicons } from "@expo/vector-icons";
import TrackPlayer, { Capability, Track } from "react-native-track-player";
import {
  getPassageText,
  selectAudioUrl,
  selectCurrentPassage,
  selectIsLoading,
  selectPassageHeader,
} from "src/redux/esvSlice";
import RenderHtml, {
  HTMLElementModel,
  HTMLContentModel,
  MixedStyleDeclaration,
} from "react-native-render-html";
import { FlatButton, MiniPlayer } from "src/components";
import { styles } from "./ReadScreen.styles";
import { spacing } from "src/style/layout";
import playerService from "../../../service";

interface ReadScrollViewProps {
  showMemoryButton: boolean;
  heading: string;
  onNextPassage: () => void;
  isFinalPassage: boolean;
}

const ReadScrollView: React.FunctionComponent<ReadScrollViewProps> = ({
  showMemoryButton,
  heading,
  onNextPassage,
  isFinalPassage,
}: ReadScrollViewProps) => {
  // State
  const [isPressingHideButton, setIsPressingHideButton] = useState(false);

  // Custom hooks
  const theme = useTheme();
  const passageText = useAppSelector(selectCurrentPassage);
  const { width } = useWindowDimensions();

  // Ref Hooks
  const scrollViewRef = useRef<ScrollView>(null);
  const animation = useRef(new Animated.Value(1)).current;
  const mountAnimation = useRef(new Animated.Value(0)).current;

  // Effect hooks
  useEffect(() => {
    Animated.timing(mountAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!isFinalPassage) {
      scrollViewRef.current?.scrollTo({ y: 0 });
    }
  }, [heading, isFinalPassage]);

  // Constants
  const themedStyles = styles({ theme });

  const tagsStyles: Record<string, MixedStyleDeclaration> = {
    body: {
      whiteSpace: "normal",
      color: theme.colors.text,
    },
    h2: {
      fontSize: header1.fontSize,
    },
    h3: {
      fontSize: header3.fontSize,
    },
    a: {
      color: colors.accent,
      textDecorationLine: "none",
    },
  };

  return (
    <Animated.ScrollView
      ref={scrollViewRef}
      style={[themedStyles.container, { opacity: mountAnimation }]}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {heading.length > 0 && <Text style={themedStyles.title}>{heading}</Text>}
      <Animated.View style={{ opacity: animation }}>
        <RenderHtml
          contentWidth={width}
          source={{ html: passageText?.passages[0] ?? "" }}
          tagsStyles={tagsStyles}
          customHTMLElementModels={{
            note: HTMLElementModel.fromCustomModel({
              tagName: "note",
              contentModel: HTMLContentModel.block,
            }),
          }}
        />
      </Animated.View>
      <View style={themedStyles.spacer} />
      {showMemoryButton && (
        <Pressable
          accessibilityRole="button"
          onPressIn={() => {
            setIsPressingHideButton(true);
            Animated.timing(animation, {
              toValue: 0,
              duration: 500,
              useNativeDriver: false,
            }).start();
          }}
          onPressOut={() => {
            setIsPressingHideButton(false);
            Animated.timing(animation, {
              toValue: 1,
              duration: 500,
              useNativeDriver: false,
            }).start();
          }}
          style={[
            themedStyles.memoryButton,
            {
              backgroundColor: isPressingHideButton ? colors.green : colors.red,
            },
          ]}
        >
          <Ionicons
            name={isPressingHideButton ? "eye" : "eye-off"}
            color={colors.white}
            style={themedStyles.memoryButtonIcon}
          />
          <Text style={themedStyles.memoryButtonText}>
            {isPressingHideButton
              ? "Release to show text"
              : "Press to hide text"}
          </Text>
        </Pressable>
      )}
      <FlatButton
        title={isFinalPassage ? "Next" : "Done"}
        onPress={onNextPassage}
        style={themedStyles.button}
      />
    </Animated.ScrollView>
  );
};

export type ReadScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Read"
>;

export const ReadScreen: React.FunctionComponent<ReadScreenProps> = ({
  route,
  navigation,
}: ReadScreenProps) => {
  // Props
  const { passages, onComplete } = route.params;

  // State
  const [passageIndex, setPassageIndex] = useState(0);
  const [shouldShowMemoryButton, setShouldShowMemoryButton] = useState(false);
  const [heading, setHeading] = useState("");
  const [currentTrack, setCurrentTrack] = useState<Track>();

  // Custom hooks
  const dispatch = useDispatch();

  // Custom hooks
  const audioUrl = useAppSelector(selectAudioUrl);
  const audioTitle = useAppSelector(selectPassageHeader);
  const isLoading = useAppSelector(selectIsLoading);
  const theme = useTheme();

  // Navbar handlers
  const playAudio = async () => {
    await TrackPlayer.reset();
    const track: Track = {
      url: audioUrl ?? "",
      title: audioTitle ?? "",
      artist: "ESV Bible",
    };
    await TrackPlayer.add(track);
    await TrackPlayer.play();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Effect hooks
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: undefined,
    });
  }, [navigation]);

  useEffect(() => {
    const passage = passages[passageIndex];
    setShouldShowMemoryButton(passage.isMemory);
    setHeading(passage.heading ?? "");
    dispatch(getPassageText({ passage, includeFootnotes: true }));
  }, [dispatch]);

  useEffect(() => {
    TrackPlayer.registerPlaybackService(() => playerService);

    async function setupPlayer() {
      try {
        await TrackPlayer.setupPlayer();
      } catch (error) {
        console.log(error);
      }
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
    if (audioUrl && audioUrl !== "") {
      navigation.setOptions({
        headerRight: ({ tintColor }: { tintColor?: string | undefined }) => (
          <Pressable
            style={{
              marginRight: spacing.large,
            }}
            accessibilityRole="button"
            onPress={() => void playAudio()}
          >
            <Text style={{ color: colors.accent, fontSize: 18 }}>Listen</Text>
          </Pressable>
        ),
      });
    }
  }, [navigation, audioUrl]);

  // Constants
  const themedStyles = styles({ theme });

  // Event handlers
  const handleNextPassage = () => {
    if (passageIndex < passages.length - 1) {
      const passage = passages[passageIndex + 1];
      setShouldShowMemoryButton(passage.isMemory);
      setHeading(passage.heading ?? "");
      dispatch(
        getPassageText({
          passage,
          includeFootnotes: !passage.isMemory,
        })
      );
      setPassageIndex(passageIndex + 1);

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView
      style={themedStyles.screen}
      edges={["left", "bottom", "right"]}
    >
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.text} />
      ) : (
        <>
          <ReadScrollView
            showMemoryButton={shouldShowMemoryButton}
            heading={heading}
            onNextPassage={handleNextPassage}
            isFinalPassage={passageIndex < passages.length - 1}
          />
          <MiniPlayer id="read-mini-player" />
        </>
      )}
    </SafeAreaView>
  );
};

/* eslint-enable react/prop-types */
