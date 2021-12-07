import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  Animated,
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
import {
  getPassageText,
  selectCurrentPassage,
  selectIsLoading,
} from "src/redux/esvSlice";
import RenderHtml, {
  HTMLElementModel,
  HTMLContentModel,
  MixedStyleDeclaration,
} from "react-native-render-html";
import { FlatButton } from "src/components";
import { styles } from "./ReadScreen.styles";

type Props = NativeStackScreenProps<RootStackParamList, "Read">;

export const ReadScreen: React.FunctionComponent<Props> = ({
  route,
  navigation,
}: Props) => {
  // Props
  const { passages, onComplete } = route.params;

  // State
  const [passageIndex, setPassageIndex] = useState(0);
  const [shouldShowMemoryButton, setShouldShowMemoryButton] = useState(false);
  const [isPressingHideButton, setIsPressingHideButton] = useState(false);

  // Custom hooks
  const dispatch = useDispatch();
  const passageText = useAppSelector(selectCurrentPassage);
  const isLoading = useAppSelector(selectIsLoading);
  const { width } = useWindowDimensions();
  const theme = useTheme();

  // Ref Hooks
  const scrollViewRef = useRef<ScrollView>(null);
  const animation = useRef(new Animated.Value(1)).current;

  // Callback hooks

  // Effect hooks
  React.useEffect(() => {
    const { book, startChapter, endChapter } = passages[passageIndex];
    dispatch(
      getPassageText({ book, startChapter, endChapter, includeFootnotes: true })
    );
  }, [dispatch]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: undefined,
    });
  }, [navigation]);

  // Event handlers
  const handleNextPassage = () => {
    if (passageIndex < passages.length - 1) {
      const { book, startChapter, endChapter, isMemory } =
        passages[passageIndex + 1];
      setShouldShowMemoryButton(isMemory);
      dispatch(
        getPassageText({
          book,
          startChapter,
          endChapter,
          includeFootnotes: !isMemory,
        })
      );
      setPassageIndex(passageIndex + 1);
      scrollViewRef.current?.scrollTo({ y: 0 });
      // eslint-disable-next-line no-void
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      // eslint-disable-next-line no-void
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
      navigation.goBack();
    }
  };

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
    <SafeAreaView
      style={themedStyles.screen}
      edges={["left", "bottom", "right"]}
    >
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.text} />
      ) : (
        <ScrollView ref={scrollViewRef} style={themedStyles.container}>
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
          {shouldShowMemoryButton && (
            <Pressable
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
                  backgroundColor: isPressingHideButton
                    ? colors.green
                    : colors.red,
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
            title={passageIndex < passages.length - 1 ? "Next" : "Done"}
            onPress={handleNextPassage}
            style={themedStyles.button}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
