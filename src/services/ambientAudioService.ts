import { Audio, AVPlaybackSource } from "expo-av";
import altPianoV1 from "assets/audio/ambient/alt-piano-v1.mp3";
import altPianoV2 from "assets/audio/ambient/alt-piano-v2.mp3";
import breathePadV1 from "assets/audio/ambient/breathe-pad-v1.mp3";
import breathePadV2 from "assets/audio/ambient/breathe-pad-v2.mp3";
import brightMorningV1 from "assets/audio/ambient/bright-morning-v1.mp3";
import brightMorningV2 from "assets/audio/ambient/bright-morning-v2.mp3";
import gentleWordEndlessField from "assets/audio/ambient/gentle-word-endless-field.mp3";
import lowDroneV1 from "assets/audio/ambient/low-drone-v1.mp3";
import lowDroneV2 from "assets/audio/ambient/low-drone-v2.mp3";
import nightQuietV1 from "assets/audio/ambient/night-quiet-v1.mp3";
import nightQuietV2 from "assets/audio/ambient/night-quiet-v2.mp3";
import pianoV1 from "assets/audio/ambient/piano-v1.mp3";
import pianoV2 from "assets/audio/ambient/piano-v2.mp3";
import quietWordsInTheHazeV1 from "assets/audio/ambient/quiet-words-in-the-haze-v1.mp3";
import quietWordsInTheHazeV2 from "assets/audio/ambient/quiet-words-in-the-haze-v2.mp3";
import rainPadV1 from "assets/audio/ambient/rain-pad-v1.mp3";
import rainPadV2 from "assets/audio/ambient/rain-pad-v2.mp3";
import stringsV1 from "assets/audio/ambient/strings-v1.mp3";
import stringsV2 from "assets/audio/ambient/strings-v2.mp3";
import tonalV1 from "assets/audio/ambient/tonal-v1.mp3";
import tonalV2 from "assets/audio/ambient/tonal-v2.mp3";

export const AMBIENT_SOUND_OPTIONS = [
  { key: "rain-pad-v1", label: "Rain + Pad I" },
  { key: "rain-pad-v2", label: "Rain + Pad II" },
  { key: "breathe-pad-v1", label: "Breathe Pad I" },
  { key: "breathe-pad-v2", label: "Breathe Pad II" },
  { key: "alt-piano-v1", label: "Alt Piano I" },
  { key: "alt-piano-v2", label: "Alt Piano II" },
  { key: "night-quiet-v1", label: "Night Quiet I" },
  { key: "night-quiet-v2", label: "Night Quiet II" },
  { key: "bright-morning-v1", label: "Bright Morning I" },
  { key: "bright-morning-v2", label: "Bright Morning II" },
  { key: "low-drone-v1", label: "Low Drone I" },
  { key: "low-drone-v2", label: "Low Drone II" },
  { key: "tonal-v1", label: "Tonal I" },
  { key: "tonal-v2", label: "Tonal II" },
  { key: "strings-v1", label: "Strings I" },
  { key: "strings-v2", label: "Strings II" },
  { key: "piano-v1", label: "Piano I" },
  { key: "piano-v2", label: "Piano II" },
  {
    key: "gentle-word-endless-field",
    label: "Gentle Word, Endless Field",
  },
  {
    key: "quiet-words-in-the-haze-v1",
    label: "Quiet Words in the Haze I",
  },
  {
    key: "quiet-words-in-the-haze-v2",
    label: "Quiet Words in the Haze II",
  },
  { key: "none", label: "None" },
] as const;

export type AmbientSound = typeof AMBIENT_SOUND_OPTIONS[number]["key"];

const AMBIENT_VOLUME = 0.3;

const AMBIENT_SOURCES: Record<
  Exclude<AmbientSound, "none">,
  AVPlaybackSource
> = {
  "rain-pad-v1": rainPadV1,
  "rain-pad-v2": rainPadV2,
  "breathe-pad-v1": breathePadV1,
  "breathe-pad-v2": breathePadV2,
  "alt-piano-v1": altPianoV1,
  "alt-piano-v2": altPianoV2,
  "night-quiet-v1": nightQuietV1,
  "night-quiet-v2": nightQuietV2,
  "bright-morning-v1": brightMorningV1,
  "bright-morning-v2": brightMorningV2,
  "low-drone-v1": lowDroneV1,
  "low-drone-v2": lowDroneV2,
  "tonal-v1": tonalV1,
  "tonal-v2": tonalV2,
  "strings-v1": stringsV1,
  "strings-v2": stringsV2,
  "piano-v1": pianoV1,
  "piano-v2": pianoV2,
  "gentle-word-endless-field": gentleWordEndlessField,
  "quiet-words-in-the-haze-v1": quietWordsInTheHazeV1,
  "quiet-words-in-the-haze-v2": quietWordsInTheHazeV2,
};

const AMBIENT_SOUND_KEYS = new Set(
  AMBIENT_SOUND_OPTIONS.map((option) => option.key)
);

export const isAmbientSound = (value: string): value is AmbientSound =>
  AMBIENT_SOUND_KEYS.has(value as AmbientSound);

let currentSound: Audio.Sound | undefined;
let currentAmbient: AmbientSound = "none";

const configureAudioMode = async (): Promise<void> => {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
};

export const getCurrentAmbientSound = (): AmbientSound => currentAmbient;

export const stopAmbient = async (): Promise<void> => {
  if (!currentSound) {
    return;
  }
  await currentSound.stopAsync();
  await currentSound.unloadAsync();
  currentSound = undefined;
};

export const playAmbient = async (ambient: AmbientSound): Promise<boolean> => {
  currentAmbient = ambient;
  if (ambient === "none") {
    await stopAmbient();
    return false;
  }

  const source = AMBIENT_SOURCES[ambient];
  if (!source) {
    await stopAmbient();
    return false;
  }

  await configureAudioMode();
  await stopAmbient();

  const { sound } = await Audio.Sound.createAsync(source, {
    isLooping: true,
    volume: AMBIENT_VOLUME,
    shouldPlay: true,
  });
  currentSound = sound;
  return true;
};

export const setAmbientVolume = async (volume: number): Promise<void> => {
  if (!currentSound) {
    return;
  }
  await currentSound.setVolumeAsync(volume);
};
