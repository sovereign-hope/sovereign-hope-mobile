import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "reselect";
import { RootState } from "src/app/store";
import { Passage } from "src/app/utils";
import {
  AmbientSound,
  getCurrentAmbientSound,
  isAmbientSound,
} from "src/services/ambientAudioService";
import {
  applySrsOutcome,
  createInitialSrsEntry,
  loadSrsEntry,
  saveSrsEntry,
  MemoryAudioOutcome,
} from "src/services/memoryAudioSrs";
import {
  startMemoryAudioSessionEngine,
  stopMemoryAudioSessionEngine,
  MemoryAudioSessionPhase,
} from "src/services/memoryAudioSession";
import { scheduleMemoryAudioReviewNotification } from "src/services/notificationSchedule";
import {
  getMemoryPassageText,
  selectMemoryAudioUrl,
} from "src/redux/memorySlice";

const AMBIENT_PREFERENCE_KEY = "@memoryAudio/ambientPreference";
const HAS_SEEN_INSTRUCTIONS_KEY = "@memoryAudio/hasSeenInstructions";

const formatRelativeReviewDate = (nextReviewDate?: string): string => {
  if (!nextReviewDate) {
    return "Next review: Today";
  }

  const today = new Date();
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
    0,
    0,
    0
  );
  const nextDate = new Date(`${nextReviewDate}T12:00:00`);
  const dayDelta = Math.round(
    (nextDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dayDelta <= 0) {
    return "Next review: Today";
  }

  if (dayDelta === 1) {
    return "Next review: Tomorrow";
  }

  return `Next review: in ${dayDelta} days`;
};

const isDateInPast = (isoDate: string): boolean => {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(
    2,
    "0"
  )}-${`${today.getDate()}`.padStart(2, "0")}`;
  return isoDate < todayKey;
};

export interface MemoryAudioState {
  sessionPhase: MemoryAudioSessionPhase;
  encodingPlaysCompleted: number;
  recallCyclesCompleted: number;
  recallCyclesTarget: number;
  currentGapDuration: number;
  sessionStartedAt?: number;
  verseAudioUrl?: string;
  isAudioCached: boolean;
  selectedAmbientSound: AmbientSound;
  ambientIsPlaying: boolean;
  srsInterval: number;
  nextReviewDate?: string;
  totalSessionsCompleted: number;
  lastSessionDate?: string;
  currentVerseReference?: string;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  hasSeenInstructions: boolean;
  isMemorySessionActive: boolean;
  backgroundedAt?: number;
}

const initialState: MemoryAudioState = {
  sessionPhase: "idle",
  encodingPlaysCompleted: 0,
  recallCyclesCompleted: 0,
  recallCyclesTarget: 6,
  currentGapDuration: 0,
  sessionStartedAt: undefined,
  verseAudioUrl: undefined,
  isAudioCached: false,
  selectedAmbientSound: "none",
  ambientIsPlaying: false,
  srsInterval: 0,
  nextReviewDate: undefined,
  totalSessionsCompleted: 0,
  lastSessionDate: undefined,
  currentVerseReference: undefined,
  isLoading: false,
  hasError: false,
  errorMessage: undefined,
  hasSeenInstructions: false,
  isMemorySessionActive: false,
  backgroundedAt: undefined,
};

const memoryAudioSlice = createSlice({
  name: "memoryAudio",
  initialState,
  reducers: {
    setHydratedState: (
      state,
      action: PayloadAction<{
        selectedAmbientSound: AmbientSound;
        hasSeenInstructions: boolean;
        srsInterval: number;
        nextReviewDate?: string;
        totalSessionsCompleted: number;
        lastSessionDate?: string;
        currentVerseReference: string;
      }>
    ) => {
      state.selectedAmbientSound = action.payload.selectedAmbientSound;
      state.hasSeenInstructions = action.payload.hasSeenInstructions;
      state.srsInterval = action.payload.srsInterval;
      state.nextReviewDate = action.payload.nextReviewDate;
      state.totalSessionsCompleted = action.payload.totalSessionsCompleted;
      state.lastSessionDate = action.payload.lastSessionDate;
      state.currentVerseReference = action.payload.currentVerseReference;
    },
    setSessionPhase: (
      state,
      action: PayloadAction<MemoryAudioSessionPhase>
    ) => {
      state.sessionPhase = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.hasError = !!action.payload;
      state.errorMessage = action.payload;
    },
    setVerseAudioUrl: (state, action: PayloadAction<string>) => {
      state.verseAudioUrl = action.payload;
    },
    setSelectedAmbientSound: (state, action: PayloadAction<AmbientSound>) => {
      state.selectedAmbientSound = action.payload;
    },
    setAmbientPlaying: (state, action: PayloadAction<boolean>) => {
      state.ambientIsPlaying = action.payload;
    },
    setHasSeenInstructions: (state, action: PayloadAction<boolean>) => {
      state.hasSeenInstructions = action.payload;
    },
    setCurrentVerseReference: (state, action: PayloadAction<string>) => {
      state.currentVerseReference = action.payload;
    },
    setMemorySessionActive: (state, action: PayloadAction<boolean>) => {
      state.isMemorySessionActive = action.payload;
    },
    setSessionStartedAt: (state, action: PayloadAction<number>) => {
      state.sessionStartedAt = action.payload;
    },
    setGapDuration: (state, action: PayloadAction<number>) => {
      state.currentGapDuration = action.payload;
    },
    setEncodingPlaysCompleted: (state, action: PayloadAction<number>) => {
      state.encodingPlaysCompleted = action.payload;
    },
    setRecallCyclesCompleted: (state, action: PayloadAction<number>) => {
      state.recallCyclesCompleted = action.payload;
    },
    setSrsState: (
      state,
      action: PayloadAction<{
        srsInterval: number;
        nextReviewDate: string;
        totalSessionsCompleted: number;
        lastSessionDate: string;
      }>
    ) => {
      state.srsInterval = action.payload.srsInterval;
      state.nextReviewDate = action.payload.nextReviewDate;
      state.totalSessionsCompleted = action.payload.totalSessionsCompleted;
      state.lastSessionDate = action.payload.lastSessionDate;
    },
    setBackgroundedAt: (state, action: PayloadAction<number | undefined>) => {
      state.backgroundedAt = action.payload;
    },
    resetSessionProgress: (state) => {
      state.encodingPlaysCompleted = 0;
      state.recallCyclesCompleted = 0;
      state.currentGapDuration = 0;
      state.sessionPhase = "idle";
      state.hasError = false;
      state.errorMessage = undefined;
    },
    resetSessionToIdle: (state) => {
      state.sessionPhase = "idle";
      state.encodingPlaysCompleted = 0;
      state.recallCyclesCompleted = 0;
      state.currentGapDuration = 0;
      state.isLoading = false;
      state.ambientIsPlaying = false;
      state.isMemorySessionActive = false;
      state.backgroundedAt = undefined;
    },
  },
});

export const memoryAudioActions = memoryAudioSlice.actions;

export const hydrateMemoryAudioState = createAsyncThunk(
  "memoryAudio/hydrateMemoryAudioState",
  async (args: { verseReference: string }, { dispatch }) => {
    const [storedAmbientSound, hasSeenInstructions, storedEntry] =
      await Promise.all([
        AsyncStorage.getItem(AMBIENT_PREFERENCE_KEY),
        AsyncStorage.getItem(HAS_SEEN_INSTRUCTIONS_KEY),
        loadSrsEntry(args.verseReference),
      ]);

    const parsedAmbientRaw =
      storedAmbientSound && storedAmbientSound !== '""'
        ? (JSON.parse(storedAmbientSound) as string)
        : undefined;
    const parsedAmbient = parsedAmbientRaw
      ? isAmbientSound(parsedAmbientRaw)
        ? parsedAmbientRaw
        : undefined
      : undefined;
    const parsedHasSeenInstructions = hasSeenInstructions
      ? (JSON.parse(hasSeenInstructions) as boolean)
      : false;

    let updatedEntry =
      storedEntry ?? createInitialSrsEntry(args.verseReference);
    if (
      updatedEntry.nextReviewDate &&
      isDateInPast(updatedEntry.nextReviewDate)
    ) {
      updatedEntry = applySrsOutcome(
        updatedEntry,
        args.verseReference,
        "skipped"
      );
      await saveSrsEntry(updatedEntry);
    }

    dispatch(
      memoryAudioActions.setHydratedState({
        selectedAmbientSound: parsedAmbient ?? getCurrentAmbientSound(),
        hasSeenInstructions: parsedHasSeenInstructions,
        srsInterval: updatedEntry.currentInterval,
        nextReviewDate: updatedEntry.nextReviewDate,
        totalSessionsCompleted: updatedEntry.totalCompletions,
        lastSessionDate: updatedEntry.lastSessionDate,
        currentVerseReference: args.verseReference,
      })
    );
  }
);

export const setSelectedAmbientSound = createAsyncThunk(
  "memoryAudio/setSelectedAmbientSound",
  async (ambientSound: AmbientSound, { dispatch }) => {
    await AsyncStorage.setItem(
      AMBIENT_PREFERENCE_KEY,
      JSON.stringify(ambientSound)
    );
    dispatch(memoryAudioActions.setSelectedAmbientSound(ambientSound));
  }
);

export const markMemoryAudioInstructionsSeen = createAsyncThunk(
  "memoryAudio/markInstructionsSeen",
  async (_, { dispatch }) => {
    await AsyncStorage.setItem(HAS_SEEN_INSTRUCTIONS_KEY, JSON.stringify(true));
    dispatch(memoryAudioActions.setHasSeenInstructions(true));
  }
);

export const recordMemorySessionOutcome = createAsyncThunk(
  "memoryAudio/recordMemorySessionOutcome",
  async (outcome: MemoryAudioOutcome, { getState, dispatch }) => {
    const state = getState() as RootState;
    const verseReference = state.memoryAudio.currentVerseReference;
    if (!verseReference) {
      return;
    }

    const existingEntry = await loadSrsEntry(verseReference);
    const updatedEntry = applySrsOutcome(
      existingEntry,
      verseReference,
      outcome,
      new Date()
    );

    await saveSrsEntry(updatedEntry);

    dispatch(
      memoryAudioActions.setSrsState({
        srsInterval: updatedEntry.currentInterval,
        nextReviewDate: updatedEntry.nextReviewDate,
        totalSessionsCompleted: updatedEntry.totalCompletions,
        lastSessionDate: updatedEntry.lastSessionDate,
      })
    );

    await scheduleMemoryAudioReviewNotification({
      verseReference,
      nextReviewDate: updatedEntry.nextReviewDate,
      notificationTime: state.settings.notificationTime,
      enableNotifications: state.settings.enableNotifications,
    });
  }
);

export const startMemoryAudioSession = createAsyncThunk(
  "memoryAudio/startMemoryAudioSession",
  async (
    args: { passage: Passage; verseReference: string },
    { dispatch, getState }
  ) => {
    dispatch(memoryAudioActions.setLoading(true));
    dispatch(memoryAudioActions.setError(undefined));
    dispatch(memoryAudioActions.setCurrentVerseReference(args.verseReference));
    await dispatch(
      hydrateMemoryAudioState({
        verseReference: args.verseReference,
      })
    );

    let verseAudioUrl = selectMemoryAudioUrl(getState() as RootState);
    if (!verseAudioUrl) {
      await dispatch(
        getMemoryPassageText({
          passage: args.passage,
        })
      );
      verseAudioUrl = selectMemoryAudioUrl(getState() as RootState);
    }

    if (!verseAudioUrl) {
      dispatch(
        memoryAudioActions.setError(
          "Unable to load memory verse audio for this session."
        )
      );
      dispatch(memoryAudioActions.setLoading(false));
      return;
    }

    dispatch(memoryAudioActions.setVerseAudioUrl(verseAudioUrl));
    dispatch(memoryAudioActions.resetSessionProgress());
    dispatch(memoryAudioActions.setSessionPhase("fetching"));

    try {
      await startMemoryAudioSessionEngine({
        verseAudioUrl,
        recallCyclesTarget: (getState() as RootState).memoryAudio
          .recallCyclesTarget,
        getSelectedAmbientSound: () =>
          (getState() as RootState).memoryAudio.selectedAmbientSound,
        onSessionStarted: () => {
          dispatch(memoryAudioActions.setMemorySessionActive(true));
          dispatch(memoryAudioActions.setSessionStartedAt(Date.now()));
          dispatch(memoryAudioActions.setLoading(false));
        },
        onPhaseChange: (phase, gapDuration) => {
          dispatch(memoryAudioActions.setSessionPhase(phase));
          if (gapDuration) {
            dispatch(memoryAudioActions.setGapDuration(gapDuration));
          }
        },
        onEncodingPlaysChange: (count) => {
          dispatch(memoryAudioActions.setEncodingPlaysCompleted(count));
        },
        onRecallCyclesChange: (count) => {
          dispatch(memoryAudioActions.setRecallCyclesCompleted(count));
        },
        onAmbientPlayingChange: (isPlaying) => {
          dispatch(memoryAudioActions.setAmbientPlaying(isPlaying));
        },
        onSessionCompleted: () => {
          dispatch(memoryAudioActions.setSessionPhase("completed"));
          dispatch(memoryAudioActions.setMemorySessionActive(false));
          void dispatch(recordMemorySessionOutcome("completed"));
          setTimeout(() => {
            dispatch(memoryAudioActions.resetSessionToIdle());
          }, 1200);
        },
        onSessionAbandoned: () => {
          dispatch(memoryAudioActions.setSessionPhase("abandoned"));
          dispatch(memoryAudioActions.setMemorySessionActive(false));
          void dispatch(recordMemorySessionOutcome("abandoned"));
          setTimeout(() => {
            dispatch(memoryAudioActions.resetSessionToIdle());
          }, 1200);
        },
        onBackgrounded: (timestamp) => {
          dispatch(memoryAudioActions.setBackgroundedAt(timestamp));
        },
      });
    } catch {
      dispatch(
        memoryAudioActions.setError("Unable to start memory audio session.")
      );
      dispatch(memoryAudioActions.setLoading(false));
      dispatch(memoryAudioActions.setMemorySessionActive(false));
    }
  }
);

export const stopMemoryAudioSession = createAsyncThunk(
  "memoryAudio/stopMemoryAudioSession",
  async () => {
    await stopMemoryAudioSessionEngine("abandoned");
  }
);

export const selectMemoryAudioState = (state: RootState): MemoryAudioState =>
  state.memoryAudio;

export const selectMemoryAudioPhase = (
  state: RootState
): MemoryAudioSessionPhase => state.memoryAudio.sessionPhase;

export const selectIsMemorySessionActive = (state: RootState): boolean =>
  state.memoryAudio.isMemorySessionActive;

export const selectMemoryAudioError = (state: RootState): string | undefined =>
  state.memoryAudio.errorMessage;

export const selectMemoryAudioViewModel = createSelector(
  [(state: RootState) => state.memoryAudio],
  (memoryAudio) => ({
    phase: memoryAudio.sessionPhase,
    encodingPlaysCompleted: memoryAudio.encodingPlaysCompleted,
    recallCyclesCompleted: memoryAudio.recallCyclesCompleted,
    recallCyclesTarget: memoryAudio.recallCyclesTarget,
    isSessionActive: memoryAudio.isMemorySessionActive,
    isLoading: memoryAudio.isLoading,
    hasError: memoryAudio.hasError,
    errorMessage: memoryAudio.errorMessage,
    selectedAmbientSound: memoryAudio.selectedAmbientSound,
    hasSeenInstructions: memoryAudio.hasSeenInstructions,
    srsStatusLabel: formatRelativeReviewDate(memoryAudio.nextReviewDate),
    completionLabel:
      memoryAudio.totalSessionsCompleted === 1
        ? "1 session completed"
        : `${memoryAudio.totalSessionsCompleted} sessions completed`,
  })
);

export const memoryAudioReducer = memoryAudioSlice.reducer;
