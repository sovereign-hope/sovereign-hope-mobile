import { AudioContext, AudioBufferSourceNode } from "react-native-audio-api";
import { Asset } from "expo-asset";
import { AMBIENT_VOLUME } from "src/services/memoryAudioConstants";
import altPianoV1 from "assets/audio/ambient/alt-piano-v1.mp3";
import altPianoV2 from "assets/audio/ambient/alt-piano-v2.mp3";
import breathePadV1 from "assets/audio/ambient/breathe-pad-v1.mp3";
import breathePadV2 from "assets/audio/ambient/breathe-pad-v2.mp3";
import brightMorningV1 from "assets/audio/ambient/bright-morning-v1.mp3";
import brightMorningV2 from "assets/audio/ambient/bright-morning-v2.mp3";
import gentleWordEndlessField from "assets/audio/ambient/gentle-word-endless-field.mp3";
import lofiContemplativeGlowV1 from "assets/audio/ambient/lofi-contemplative-glow-v1.mp3";
import lofiContemplativeGlowV2 from "assets/audio/ambient/lofi-contemplative-glow-v2.mp3";
import lofiGospelLiftV1 from "assets/audio/ambient/lofi-gospel-lift-v1.mp3";
import lofiGospelLiftV2 from "assets/audio/ambient/lofi-gospel-lift-v2.mp3";
import lofiJazzSunbeam from "assets/audio/ambient/lofi-jazz-sunbeam.mp3";
import lofiMorningGladnessV1 from "assets/audio/ambient/lofi-morning-gladness-v1.mp3";
import lofiMorningGladnessV2 from "assets/audio/ambient/lofi-morning-gladness-v2.mp3";
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
import upbeatMarimbaSpark from "assets/audio/ambient/upbeat-marimba-spark.mp3";
import upbeatPadsRiseV1 from "assets/audio/ambient/upbeat-pads-rise-v1.mp3";
import upbeatPadsRiseV2 from "assets/audio/ambient/upbeat-pads-rise-v2.mp3";
import upbeatPianoJoy from "assets/audio/ambient/upbeat-piano-joy.mp3";
import upbeatSynthFlight from "assets/audio/ambient/upbeat-synth-flight.mp3";

export const AMBIENT_SOUND_OPTIONS = [
  {
    key: "rain-pad-v1",
    label: "Sanctuary Rain",
    description: "Rainfall with a soft devotional pad.",
  },
  {
    key: "rain-pad-v2",
    label: "Candlelit Rain",
    description: "Rain and ambient glow for slower focus.",
  },
  {
    key: "breathe-pad-v1",
    label: "Still Breath",
    description: "Wide, airy pad with no rhythmic movement.",
  },
  {
    key: "breathe-pad-v2",
    label: "Breath of Dawn",
    description: "A brighter breathing pad with gentle lift.",
  },
  {
    key: "alt-piano-v1",
    label: "Soft Keys at Dusk",
    description: "Sparse piano textures with light sustain.",
  },
  {
    key: "alt-piano-v2",
    label: "Keys in the Quiet",
    description: "Warm piano ambience with subtle resonance.",
  },
  {
    key: "night-quiet-v1",
    label: "Midnight Stillness",
    description: "Dark, quiet atmosphere with very low motion.",
  },
  {
    key: "night-quiet-v2",
    label: "Moonlit Silence",
    description: "Calm nocturnal bed for reflective recitation.",
  },
  {
    key: "bright-morning-v1",
    label: "First Light",
    description: "Clear and gentle morning ambience.",
  },
  {
    key: "bright-morning-v2",
    label: "Morning Mercy",
    description: "Bright but soft tone with hopeful lift.",
  },
  {
    key: "low-drone-v1",
    label: "Deep Foundation",
    description: "Low, grounded drone for concentration.",
  },
  {
    key: "low-drone-v2",
    label: "Humble Resonance",
    description: "Richer low-end bed with a calm center.",
  },
  {
    key: "tonal-v1",
    label: "Warm Horizon",
    description: "Neutral tonal layer that stays out of the way.",
  },
  {
    key: "tonal-v2",
    label: "Open Sky Tone",
    description: "A clearer tonal wash with a little air.",
  },
  {
    key: "strings-v1",
    label: "Gentle Strings",
    description: "Soft strings with restrained movement.",
  },
  {
    key: "strings-v2",
    label: "Lifted Strings",
    description: "Slightly fuller strings for emotional warmth.",
  },
  {
    key: "piano-v1",
    label: "Prayer Piano",
    description: "Simple contemplative piano ambience.",
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
    key: "quiet-words-in-the-haze-v2",
    label: "Quiet Words in the Haze (Alt)",
    description: "Alternate haze bed with slightly different color.",
  },
  {
    key: "lofi-morning-gladness-v1",
    label: "Golden Hour Drift",
    description: "Warm lo-fi bounce for a brighter morning rhythm.",
  },
  {
    key: "lofi-morning-gladness-v2",
    label: "Sunrise Sidewalk",
    description: "Morning lo-fi with soft drive and easy momentum.",
  },
  {
    key: "lofi-gospel-lift-v1",
    label: "Amen on Vinyl",
    description: "Soulful lo-fi lift with reflective gospel color.",
  },
  {
    key: "lofi-gospel-lift-v2",
    label: "Mercy in Motion",
    description: "Upward lo-fi groove that stays calm and prayerful.",
  },
  {
    key: "lofi-contemplative-glow-v1",
    label: "Lantern Lo-fi",
    description: "Gentle glow and steady beat for focused repetition.",
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
    key: "upbeat-pads-rise-v1",
    label: "Ascend in Color",
    description: "Brighter pad rhythm with forward-moving optimism.",
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
  "lofi-morning-gladness-v1": lofiMorningGladnessV1,
  "lofi-morning-gladness-v2": lofiMorningGladnessV2,
  "lofi-gospel-lift-v1": lofiGospelLiftV1,
  "lofi-gospel-lift-v2": lofiGospelLiftV2,
  "lofi-contemplative-glow-v1": lofiContemplativeGlowV1,
  "lofi-contemplative-glow-v2": lofiContemplativeGlowV2,
  "lofi-jazz-sunbeam": lofiJazzSunbeam,
  "upbeat-marimba-spark": upbeatMarimbaSpark,
  "upbeat-pads-rise-v1": upbeatPadsRiseV1,
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
let currentAmbient: AmbientSound = "none";

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
