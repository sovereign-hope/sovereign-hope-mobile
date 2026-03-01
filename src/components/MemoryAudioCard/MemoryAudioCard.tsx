import React from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
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
import { styles } from "./MemoryAudioCard.styles";

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
  const themedStyles = styles({ theme });
  const viewModel = useAppSelector(selectMemoryAudioViewModel);
  const [showInstructions, setShowInstructions] = React.useState(false);
  const [showSessionDetails, setShowSessionDetails] = React.useState(false);
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
          <ActivityIndicator color={theme.colors.text} />
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
              {
                opacity: pressed ? 0.8 : 1,
              },
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
              setShowSessionDetails(true);
            }}
            style={({ pressed }) => [
              themedStyles.settingsIconButton,
              {
                opacity: pressed ? 0.8 : 1,
              },
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

      <Modal transparent visible={showInstructions} animationType="fade">
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
                setShowInstructions(false);
                void dispatch(markMemoryAudioInstructionsSeen());
              }}
              style={({ pressed }) => [
                themedStyles.actionButton,
                {
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={themedStyles.actionButtonLabel}>Got It</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showSessionDetails} animationType="fade">
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
                setShowSessionDetails(false);
                navigation.push("Ambient Sounds");
              }}
              style={({ pressed }) => [
                themedStyles.actionButton,
                {
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={themedStyles.actionButtonLabel}>Choose Sound</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close details"
              accessibilityHint="Closes daily listening details."
              onPress={() => {
                setShowSessionDetails(false);
              }}
              style={({ pressed }) => [
                themedStyles.secondaryButton,
                {
                  opacity: pressed ? 0.8 : 1,
                },
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
