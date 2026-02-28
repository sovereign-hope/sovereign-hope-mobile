import React from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Passage } from "src/app/utils";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import {
  hydrateMemoryAudioState,
  markMemoryAudioInstructionsSeen,
  selectMemoryAudioViewModel,
  setSelectedAmbientSound,
  startMemoryAudioSession,
  stopMemoryAudioSession,
} from "src/redux/memoryAudioSlice";
import { AMBIENT_SOUND_OPTIONS } from "src/services/ambientAudioService";
import { styles } from "./MemoryAudioCard.styles";

type Props = {
  verseReference?: string;
  passage?: Passage;
};

const phaseLabels: Record<string, string> = {
  encoding_playing: "Encoding",
  encoding_gap: "Encoding Gap",
  recall_playing: "Recall",
  recall_gap: "Recall Gap",
  completed: "Completed",
  abandoned: "Abandoned",
  fetching: "Loading audio...",
};

const getPhaseLabel = (phase: string): string => phaseLabels[phase] ?? "Ready";

export const MemoryAudioCard: React.FunctionComponent<Props> = ({
  verseReference,
  passage,
}) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const themedStyles = styles({ theme });
  const viewModel = useAppSelector(selectMemoryAudioViewModel);
  const [showInstructions, setShowInstructions] = React.useState(false);

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
  const phaseLabel = getPhaseLabel(viewModel.phase);
  const progressLabel =
    viewModel.phase.startsWith("encoding") ||
    viewModel.phase === "encoding_playing" ||
    viewModel.phase === "encoding_gap"
      ? `Encoding ${viewModel.encodingPlaysCompleted} / 3`
      : `Cycle ${viewModel.recallCyclesCompleted} of ${viewModel.recallCyclesTarget}`;

  return (
    <View style={themedStyles.card}>
      <Text style={themedStyles.cardHeader}>Memory Audio Helper</Text>
      <Text style={themedStyles.cardSubHeader}>{verseReference}</Text>

      <View style={themedStyles.statusRow}>
        <Text style={themedStyles.statusText}>{viewModel.srsStatusLabel}</Text>
        <Text style={themedStyles.statusText}>{phaseLabel}</Text>
      </View>
      <Text style={themedStyles.progressText}>{viewModel.completionLabel}</Text>

      {viewModel.isLoading ? (
        <ActivityIndicator color={theme.colors.text} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isActive ? "Stop memory session" : "Start memory session"
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
            themedStyles.actionButton,
            isActive ? themedStyles.stopButton : undefined,
            {
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={themedStyles.actionButtonLabel}>
            {isActive ? "Stop Session" : "Start Session"}
          </Text>
        </Pressable>
      )}

      {isActive && (
        <Text style={themedStyles.progressText}>{progressLabel}</Text>
      )}

      <Text style={themedStyles.cardSubHeader}>Ambient Sound</Text>
      <View style={themedStyles.soundPicker}>
        {AMBIENT_SOUND_OPTIONS.map((option) => {
          const isSelected = viewModel.selectedAmbientSound === option.key;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityLabel={`Select ambient sound: ${option.label}`}
              accessibilityHint={`Changes the ambient background to ${option.label}.`}
              onPress={() => {
                void dispatch(setSelectedAmbientSound(option.key));
              }}
              style={({ pressed }) => [
                themedStyles.soundPill,
                isSelected ? themedStyles.soundPillSelected : undefined,
                {
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  themedStyles.soundPillText,
                  isSelected ? themedStyles.soundPillTextSelected : undefined,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={themedStyles.helperText}>
        During silence, recite the verse from memory. Gaps widen as you
        progress.
      </Text>

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
    </View>
  );
};
