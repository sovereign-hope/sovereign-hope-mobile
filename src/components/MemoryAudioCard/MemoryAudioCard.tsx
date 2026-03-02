import React from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - No types for this package
import Bar from "react-native-progress/Bar";
import { Passage } from "src/app/utils";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import {
  hydrateMemoryAudioState,
  markMemoryAudioInstructionsSeen,
  selectMemoryAudioViewModel,
  startMemoryAudioSession,
  stopMemoryAudioSession,
} from "src/redux/memoryAudioSlice";
import { AMBIENT_SOUND_OPTIONS } from "src/services/ambientAudioService";
import { colors } from "src/style/colors";
import { styles } from "./MemoryAudioCard.styles";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { getPressFeedbackStyle } from "src/style/eink";

type Props = {
  verseReference?: string;
  passage?: Passage;
  embedded?: boolean;
};

export const MemoryAudioCard: React.FunctionComponent<Props> = ({
  verseReference,
  passage,
  embedded = false,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const uiPreferences = useUiPreferences();
  const themedStyles = styles({ theme, isEinkMode: uiPreferences.isEinkMode });
  const viewModel = useAppSelector(selectMemoryAudioViewModel);
  const [showInstructions, setShowInstructions] = React.useState(false);
  const [showSessionDetails, setShowSessionDetails] = React.useState(false);
  const [shouldOpenAmbientPicker, setShouldOpenAmbientPicker] =
    React.useState(false);
  const selectedAmbientLabel = React.useMemo(() => {
    return (
      AMBIENT_SOUND_OPTIONS.find(
        (option) => option.key === viewModel.selectedAmbientSound
      )?.label ?? "Silence"
    );
  }, [viewModel.selectedAmbientSound]);

  React.useEffect(() => {
    if (verseReference) {
      void dispatch(
        hydrateMemoryAudioState({
          verseReference,
        })
      );
    }
  }, [dispatch, verseReference]);

  React.useEffect(() => {
    if (
      viewModel.isSessionActive &&
      !viewModel.hasSeenInstructions &&
      !showInstructions
    ) {
      setShowInstructions(true);
    }
  }, [
    viewModel.isSessionActive,
    viewModel.hasSeenInstructions,
    showInstructions,
  ]);

  const openAmbientPicker = React.useCallback(() => {
    navigation.push("Ambient Sounds");
    setShouldOpenAmbientPicker(false);
  }, [navigation]);

  React.useEffect(() => {
    if (
      Platform.OS !== "ios" &&
      shouldOpenAmbientPicker &&
      !showSessionDetails
    ) {
      openAmbientPicker();
    }
  }, [openAmbientPicker, shouldOpenAmbientPicker, showSessionDetails]);

  if (!verseReference || !passage) {
    // eslint-disable-next-line unicorn/no-null
    return null;
  }

  const isActive = viewModel.isSessionActive;

  return (
    <View
      style={[
        themedStyles.card,
        embedded ? themedStyles.embeddedCard : undefined,
      ]}
    >
      {viewModel.isLoading ? (
        <View style={themedStyles.loadingState}>
          <Text style={themedStyles.loadingTitle}>
            Preparing your daily listening
          </Text>
          <Text style={themedStyles.loadingCaption}>
            {viewModel.loadingMessage}
          </Text>
          <Bar
            progress={viewModel.loadingProgress}
            // eslint-disable-next-line unicorn/no-null
            width={null}
            color={colors.accent}
            unfilledColor={theme.dark ? "rgba(255,255,255,0.18)" : "#D8DCE6"}
            borderWidth={0}
            animationType="timing"
            animationConfig={{
              duration: uiPreferences.disableAnimations ? 0 : 250,
            }}
            indeterminate={viewModel.loadingProgress <= 0}
            style={themedStyles.loadingProgressTrack}
          />
        </View>
      ) : (
        <View style={themedStyles.sessionControlRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isActive ? "Stop daily listening" : "Start daily listening"
            }
            accessibilityHint={
              isActive
                ? "Stops the current memory audio session."
                : "Starts a guided memory audio session."
            }
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (isActive) {
                void dispatch(stopMemoryAudioSession());
              } else {
                void dispatch(
                  startMemoryAudioSession({ passage, verseReference })
                );
              }
            }}
            style={({ pressed }) => [
              themedStyles.sessionActionButton,
              isActive ? themedStyles.stopButton : undefined,
              getPressFeedbackStyle(pressed, uiPreferences.isEinkMode, 0.8),
            ]}
          >
            <Text style={themedStyles.actionButtonLabel}>
              {isActive ? "Stop Listening" : "Start Daily Listening"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Daily listening settings"
            accessibilityHint="Opens details and settings for daily listening."
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSessionDetails(true);
            }}
            style={({ pressed }) => [
              themedStyles.settingsIconButton,
              getPressFeedbackStyle(pressed, uiPreferences.isEinkMode, 0.8),
            ]}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={theme.colors.text}
            />
          </Pressable>
        </View>
      )}

      <Modal
        transparent
        visible={showInstructions}
        animationType={uiPreferences.disableAnimations ? "none" : "fade"}
      >
        <View style={themedStyles.modalBackdrop}>
          <View style={themedStyles.modalCard}>
            <Text style={themedStyles.modalTitle}>How To Practice</Text>
            <Text style={themedStyles.modalBody}>
              During the silence, try to recite the verse from memory. The gaps
              get longer as you improve recall.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Got it"
              accessibilityHint="Dismisses instructions and returns to the session."
              onPress={() => {
                void Haptics.selectionAsync();
                setShowInstructions(false);
                void dispatch(markMemoryAudioInstructionsSeen());
              }}
              style={({ pressed }) => [
                themedStyles.actionButton,
                getPressFeedbackStyle(pressed, uiPreferences.isEinkMode, 0.8),
              ]}
            >
              <Text style={themedStyles.actionButtonLabel}>Got It</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showSessionDetails}
        animationType={uiPreferences.disableAnimations ? "none" : "fade"}
        onDismiss={() => {
          if (shouldOpenAmbientPicker) {
            openAmbientPicker();
          }
        }}
      >
        <View style={themedStyles.modalBackdrop}>
          <View style={themedStyles.modalCard}>
            <Text style={themedStyles.modalTitle}>Daily Listening</Text>
            <Text style={themedStyles.modalBody}>
              A guided memory practice that alternates between listening and
              silence so you can recite from memory during the gaps.
            </Text>

            <View style={themedStyles.metricsRow}>
              <Text style={themedStyles.metricLabel}>Completed</Text>
              <Text style={themedStyles.metricValue}>
                {viewModel.completionLabel}
              </Text>
            </View>

            <View style={themedStyles.metricsRow}>
              <Text style={themedStyles.metricLabel}>Ambient Sound</Text>
              <Text style={themedStyles.metricValue}>
                {selectedAmbientLabel}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose ambient sound"
              accessibilityHint="Opens ambient sound previews and selection."
              onPress={() => {
                void Haptics.selectionAsync();
                setShouldOpenAmbientPicker(true);
                setShowSessionDetails(false);
              }}
              style={({ pressed }) => [
                themedStyles.actionButton,
                getPressFeedbackStyle(pressed, uiPreferences.isEinkMode, 0.8),
              ]}
            >
              <Text style={themedStyles.actionButtonLabel}>Choose Sound</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close details"
              accessibilityHint="Closes daily listening details."
              onPress={() => {
                void Haptics.selectionAsync();
                setShowSessionDetails(false);
              }}
              style={({ pressed }) => [
                themedStyles.secondaryButton,
                getPressFeedbackStyle(pressed, uiPreferences.isEinkMode, 0.8),
              ]}
            >
              <Text style={themedStyles.secondaryButtonLabel}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};
