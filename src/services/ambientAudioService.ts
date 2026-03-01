import { AudioContext, AudioBufferSourceNode } from "react-native-audio-api";
import { Asset } from "expo-asset";
import { AMBIENT_VOLUME } from "src/services/memoryAudioConstants";
import altPianoV2 from "assets/audio/ambient/alt-piano-v2.mp3";
import breathePadV2 from "assets/audio/ambient/breathe-pad-v2.mp3";
import brightMorningV2 from "assets/audio/ambient/bright-morning-v2.mp3";
import gentleWordEndlessField from "assets/audio/ambient/gentle-word-endless-field.mp3";
import lofiContemplativeGlowV2 from "assets/audio/ambient/lofi-contemplative-glow-v2.mp3";
import lofiGospelLiftV2 from "assets/audio/ambient/lofi-gospel-lift-v2.mp3";
import lofiJazzSunbeam from "assets/audio/ambient/lofi-jazz-sunbeam.mp3";
import lofiMorningGladnessV2 from "assets/audio/ambient/lofi-morning-gladness-v2.mp3";
import lowDroneV2 from "assets/audio/ambient/low-drone-v2.mp3";
import nightQuietV2 from "assets/audio/ambient/night-quiet-v2.mp3";
import pianoV2 from "assets/audio/ambient/piano-v2.mp3";
import quietWordsInTheHazeV1 from "assets/audio/ambient/quiet-words-in-the-haze-v1.mp3";
import rainPadV2 from "assets/audio/ambient/rain-pad-v2.mp3";
import stringsV2 from "assets/audio/ambient/strings-v2.mp3";
import tonalV2 from "assets/audio/ambient/tonal-v2.mp3";
import upbeatMarimbaSpark from "assets/audio/ambient/upbeat-marimba-spark.mp3";
import upbeatPadsRiseV2 from "assets/audio/ambient/upbeat-pads-rise-v2.mp3";
import upbeatPianoJoy from "assets/audio/ambient/upbeat-piano-joy.mp3";
import upbeatSynthFlight from "assets/audio/ambient/upbeat-synth-flight.mp3";

export const AMBIENT_SOUND_OPTIONS = [
  {
    key: "rain-pad-v2",
    label: "Candlelit Rain",
    description: "Rain and ambient glow for slower focus.",
  },
  {
    key: "breathe-pad-v2",
    label: "Breath of Dawn",
    description: "A brighter breathing pad with gentle lift.",
  },
  {
    key: "alt-piano-v2",
    label: "Keys in the Quiet",
    description: "Warm piano ambience with subtle resonance.",
  },
  {
    key: "night-quiet-v2",
    label: "Moonlit Silence",
    description: "Calm nocturnal bed for reflective recitation.",
  },
  {
    key: "bright-morning-v2",
    label: "Morning Mercy",
    description: "Bright but soft tone with hopeful lift.",
  },
  {
    key: "low-drone-v2",
    label: "Humble Resonance",
    description: "Richer low-end bed with a calm center.",
  },
  {
    key: "tonal-v2",
    label: "Open Sky Tone",
    description: "A clearer tonal wash with a little air.",
  },
  {
    key: "strings-v2",
    label: "Lifted Strings",
    description: "Slightly fuller strings for emotional warmth.",
  },
  {
    key: "piano-v2",
    label: "Quiet Chapel Piano",
    description: "Slower, softer piano with longer tail.",
  },
  {
    key: "gentle-word-endless-field",
    label: "Gentle Word, Endless Field",
    description: "Wide cinematic pad with open, pastoral space.",
  },
  {
    key: "quiet-words-in-the-haze-v1",
    label: "Quiet Words in the Haze",
    description: "Muted haze texture that supports memorization.",
  },
  {
    key: "lofi-morning-gladness-v2",
    label: "Sunrise Sidewalk",
    description: "Morning lo-fi with soft drive and easy momentum.",
  },
  {
    key: "lofi-gospel-lift-v2",
    label: "Mercy in Motion",
    description: "Upward lo-fi groove that stays calm and prayerful.",
  },
  {
    key: "lofi-contemplative-glow-v2",
    label: "Quiet Spark Lo-fi",
    description: "A softer lo-fi pulse with hopeful melodic warmth.",
  },
  {
    key: "lofi-jazz-sunbeam",
    label: "Bluebird Courtyard",
    description: "Laid-back jazz lo-fi with sunlight and motion.",
  },
  {
    key: "upbeat-marimba-spark",
    label: "Joyful Footsteps",
    description: "Playful marimba energy with clean, uplifting timing.",
  },
  {
    key: "upbeat-pads-rise-v2",
    label: "Skyward Pulse",
    description: "A faster, airy pad groove with contemplative lift.",
  },
  {
    key: "upbeat-synth-flight",
    label: "Neon Thankfulness",
    description: "Smooth synth motion with an upbeat devotional feel.",
  },
  {
    key: "upbeat-piano-joy",
    label: "Bright Grace Keys",
    description: "Up-tempo piano bed that stays warm and meditative.",
  },
  { key: "none", label: "Silence", description: "No ambient backing track." },
] as const;

export type AmbientSound = typeof AMBIENT_SOUND_OPTIONS[number]["key"];
export type AmbientSoundOption = typeof AMBIENT_SOUND_OPTIONS[number];

// Asset module IDs for each ambient sound. Used by the renderer for decoding.
export const AMBIENT_SOURCES: Record<Exclude<AmbientSound, "none">, number> = {
  "rain-pad-v2": rainPadV2,
  "breathe-pad-v2": breathePadV2,
  "alt-piano-v2": altPianoV2,
  "night-quiet-v2": nightQuietV2,
  "bright-morning-v2": brightMorningV2,
  "low-drone-v2": lowDroneV2,
  "tonal-v2": tonalV2,
  "strings-v2": stringsV2,
  "piano-v2": pianoV2,
  "gentle-word-endless-field": gentleWordEndlessField,
  "quiet-words-in-the-haze-v1": quietWordsInTheHazeV1,
  "lofi-morning-gladness-v2": lofiMorningGladnessV2,
  "lofi-gospel-lift-v2": lofiGospelLiftV2,
  "lofi-contemplative-glow-v2": lofiContemplativeGlowV2,
  "lofi-jazz-sunbeam": lofiJazzSunbeam,
  "upbeat-marimba-spark": upbeatMarimbaSpark,
  "upbeat-pads-rise-v2": upbeatPadsRiseV2,
  "upbeat-synth-flight": upbeatSynthFlight,
  "upbeat-piano-joy": upbeatPianoJoy,
};

const AMBIENT_SOUND_KEYS = new Set(
  AMBIENT_SOUND_OPTIONS.map((option) => option.key)
);

export const isAmbientSound = (value: string): value is AmbientSound =>
  AMBIENT_SOUND_KEYS.has(value as AmbientSound);

// ---------------------------------------------------------------------------
// Preview playback (used by AmbientSoundPickerScreen)
// ---------------------------------------------------------------------------

let previewContext: AudioContext | undefined;
let previewSource: AudioBufferSourceNode | undefined;
let currentAmbient: AmbientSound = "gentle-word-endless-field";

export const getCurrentAmbientSound = (): AmbientSound => currentAmbient;

export const stopAmbient = async (): Promise<void> => {
  if (previewSource) {
    try {
      previewSource.stop();
    } catch {
      // Already stopped
    }
    previewSource = undefined;
  }

  if (previewContext) {
    try {
      await previewContext.close();
    } catch {
      // Already closed
    }
    previewContext = undefined;
  }
};

export const playAmbientPreview = async (
  ambient: AmbientSound
): Promise<boolean> => {
  currentAmbient = ambient;

  if (ambient === "none") {
    await stopAmbient();
    return false;
  }

  const moduleId = AMBIENT_SOURCES[ambient];
  if (moduleId === undefined) {
    await stopAmbient();
    return false;
  }

  await stopAmbient();

  try {
    const asset = await Asset.fromModule(moduleId).downloadAsync();
    if (!asset.localUri) return false;

    const response = await fetch(asset.localUri);
    const arrayBuffer = await response.arrayBuffer();

    previewContext = new AudioContext();
    const audioBuffer = await previewContext.decodeAudioData(arrayBuffer);

    previewSource = previewContext.createBufferSource();
    previewSource.buffer = audioBuffer;
    previewSource.loop = true;

    const gainNode = previewContext.createGain();
    gainNode.gain.setValueAtTime(AMBIENT_VOLUME, previewContext.currentTime);
    previewSource.connect(gainNode);
    gainNode.connect(previewContext.destination);

    previewSource.start(0);
    return true;
  } catch {
    await stopAmbient();
    return false;
  }
};
