import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
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

  // Custom hooks
  const dispatch = useDispatch();
  const passageText = useAppSelector(selectCurrentPassage);
  const isLoading = useAppSelector(selectIsLoading);
  const { width } = useWindowDimensions();
  const theme = useTheme();

  // Ref Hooks
  const scrollViewRef = useRef<ScrollView>(null);

  // Callback hooks

  // Effect hooks
  React.useEffect(() => {
    const { book, startChapter, endChapter } = passages[passageIndex];
    dispatch(getPassageText({ book, startChapter, endChapter }));
  }, [dispatch]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: undefined,
    });
  }, [navigation]);

  // Event handlers
  const handleNextPassage = () => {
    if (passageIndex < passages.length - 1) {
      const { book, startChapter, endChapter } = passages[passageIndex + 1];
      dispatch(getPassageText({ book, startChapter, endChapter }));
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
          <FlatButton
            title={passageIndex < passages.length - 1 ? "Next" : "Done"}
            onPress={handleNextPassage}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
