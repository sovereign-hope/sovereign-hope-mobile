import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import {
  selectIsMemorySessionActive,
  selectMemoryAudioState,
  setSelectedAmbientSound,
} from "src/redux/memoryAudioSlice";
import {
  AMBIENT_SOUND_OPTIONS,
  AmbientSound,
  playAmbientPreview,
  stopAmbient,
} from "src/services/ambientAudioService";
import { styles } from "./AmbientSoundPickerScreen.styles";
import { colors } from "src/style/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Ambient Sounds">;

export const AmbientSoundPickerScreen: React.FunctionComponent<Props> = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const themedStyles = styles({ theme });
  const miniPlayerHeight = useMiniPlayerHeight();
  const memoryAudioState = useAppSelector(selectMemoryAudioState);
  const isSessionActive = useAppSelector(selectIsMemorySessionActive);
  const [previewingSound, setPreviewingSound] = React.useState<
    AmbientSound | undefined
  >();

  const selectedAmbientSound = memoryAudioState.selectedAmbientSound;

  React.useEffect(() => {
    return () => {
      void stopAmbient();
    };
  }, []);

  const onSelectSound = React.useCallback(
    async (sound: AmbientSound) => {
      if (isSessionActive) {
        return;
      }

      void Haptics.selectionAsync();
      await dispatch(setSelectedAmbientSound(sound));
      if (sound === "none") {
        await stopAmbient();
        setPreviewingSound(undefined);
      }
    },
    [dispatch, isSessionActive]
  );

  const onTogglePreview = React.useCallback(
    async (sound: AmbientSound) => {
      if (isSessionActive) {
        return;
      }

      if (sound === "none") {
        void Haptics.selectionAsync();
        await stopAmbient();
        setPreviewingSound(undefined);
        return;
      }

      if (previewingSound === sound) {
        void Haptics.selectionAsync();
        await stopAmbient();
        setPreviewingSound(undefined);
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const didStart = await playAmbientPreview(sound);
      setPreviewingSound(didStart ? sound : undefined);
    },
    [isSessionActive, previewingSound]
  );

  return (
    <SafeAreaView edges={["left", "right"]} style={themedStyles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: miniPlayerHeight }}
        scrollIndicatorInsets={{ bottom: miniPlayerHeight }}
      >
        <View style={themedStyles.headerCard}>
          <Text style={themedStyles.title}>Choose an ambient sound</Text>
          <Text style={themedStyles.subtitle}>
            Preview each sound, then select the one you want for memory audio
            sessions.
          </Text>
          {isSessionActive && (
            <Text style={themedStyles.notice}>
              Stop the active memory session before changing or previewing
              sounds.
            </Text>
          )}
        </View>

        <View style={themedStyles.listContainer}>
          {AMBIENT_SOUND_OPTIONS.map((option) => {
            const isSelected = selectedAmbientSound === option.key;
            const isPreviewing = previewingSound === option.key;
            const previewDisabled = isSessionActive || option.key === "none";

            return (
              <View
                key={option.key}
                style={[
                  themedStyles.soundRow,
                  isSelected ? themedStyles.soundRowSelected : undefined,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Use sound: ${option.label}`}
                  accessibilityHint="Sets this as the ambient sound for future memory sessions."
                  onPress={() => {
                    void onSelectSound(option.key);
                  }}
                  disabled={isSessionActive}
                  style={themedStyles.soundRowMain}
                >
                  <View style={themedStyles.rowHeader}>
                    <Text style={themedStyles.soundLabel}>{option.label}</Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.green}
                      />
                    )}
                  </View>
                  <Text style={themedStyles.soundDescription}>
                    {option.description}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    option.key === "none"
                      ? "Stop preview"
                      : isPreviewing
                      ? `Stop preview: ${option.label}`
                      : `Preview sound: ${option.label}`
                  }
                  accessibilityHint="Starts or stops a looping preview."
                  onPress={() => {
                    void onTogglePreview(option.key);
                  }}
                  disabled={previewDisabled}
                  style={({ pressed }) => [
                    themedStyles.previewButton,
                    previewDisabled
                      ? themedStyles.previewButtonDisabled
                      : undefined,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons
                    name={isPreviewing ? "pause" : "play"}
                    size={16}
                    color={colors.white}
                  />
                  <Text style={themedStyles.previewButtonLabel}>
                    {isPreviewing ? "Stop" : "Preview"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
