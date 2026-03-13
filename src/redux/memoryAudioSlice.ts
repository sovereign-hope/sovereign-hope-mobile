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
  pauseMemoryAudioSessionEngine,
  resumeMemoryAudioSessionEngine,
  seekMemoryAudioSessionEngine,
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
  if (Number.isNaN(nextDate.getTime())) {
    return "Next review: Today";
  }
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
  spokenDurationSeconds: number;
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
  loadingProgress: number;
  loadingMessage: string;
  hasError: boolean;
  errorMessage?: string;
  hasSeenInstructions: boolean;
  sessionDurationSeconds: number;
  isMemorySessionActive: boolean;
  isSessionPaused: boolean;
  backgroundedAt?: number;
}

const initialState: MemoryAudioState = {
  sessionPhase: "idle",
  encodingPlaysCompleted: 0,
  recallCyclesCompleted: 0,
  recallCyclesTarget: 6,
  currentGapDuration: 0,
  sessionStartedAt: undefined,
  spokenDurationSeconds: 0,
  verseAudioUrl: undefined,
  isAudioCached: false,
  selectedAmbientSound: "gentle-word-endless-field",
  ambientIsPlaying: false,
  srsInterval: 0,
  nextReviewDate: undefined,
  totalSessionsCompleted: 0,
  lastSessionDate: undefined,
  currentVerseReference: undefined,
  isLoading: false,
  loadingProgress: 0,
  loadingMessage: "Preparing your daily listening...",
  hasError: false,
  errorMessage: undefined,
  hasSeenInstructions: false,
  sessionDurationSeconds: 0,
  isMemorySessionActive: false,
  isSessionPaused: false,
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
      if (
        action.payload === "idle" ||
        action.payload === "completed" ||
        action.payload === "abandoned"
      ) {
        state.isMemorySessionActive = false;
        state.isSessionPaused = false;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (!action.payload) {
        state.loadingProgress = 0;
      }
    },
    setLoadingProgress: (
      state,
      action: PayloadAction<{ progress: number; message: string }>
    ) => {
      state.loadingProgress = Math.max(0, Math.min(1, action.payload.progress));
      state.loadingMessage = action.payload.message;
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
    setSessionDurationSeconds: (state, action: PayloadAction<number>) => {
      state.sessionDurationSeconds = action.payload;
    },
    setMemorySessionActive: (state, action: PayloadAction<boolean>) => {
      state.isMemorySessionActive = action.payload;
    },
    setSessionPaused: (state, action: PayloadAction<boolean>) => {
      state.isSessionPaused = action.payload;
    },
    setSessionStartedAt: (state, action: PayloadAction<number>) => {
      state.sessionStartedAt = action.payload;
    },
    setSpokenDurationSeconds: (state, action: PayloadAction<number>) => {
      state.spokenDurationSeconds = action.payload;
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
      state.sessionStartedAt = undefined;
      state.spokenDurationSeconds = 0;
      state.isSessionPaused = false;
      state.hasError = false;
      state.errorMessage = undefined;
      state.loadingProgress = 0;
      state.loadingMessage = "Preparing your daily listening...";
    },
    resetSessionToIdle: (state) => {
      state.sessionPhase = "idle";
      state.encodingPlaysCompleted = 0;
      state.recallCyclesCompleted = 0;
      state.currentGapDuration = 0;
      state.sessionStartedAt = undefined;
      state.spokenDurationSeconds = 0;
      state.sessionDurationSeconds = 0;
      state.isLoading = false;
      state.loadingProgress = 0;
      state.loadingMessage = "Preparing your daily listening...";
      state.ambientIsPlaying = false;
      state.isMemorySessionActive = false;
      state.isSessionPaused = false;
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

    let parsedAmbient: AmbientSound | undefined;
    try {
      const parsedAmbientRaw =
        storedAmbientSound && storedAmbientSound !== '""'
          ? (JSON.parse(storedAmbientSound) as string)
          : undefined;
      parsedAmbient = parsedAmbientRaw
        ? isAmbientSound(parsedAmbientRaw)
          ? parsedAmbientRaw
          : undefined
        : undefined;
    } catch {
      parsedAmbient = undefined;
    }
    let parsedHasSeenInstructions = false;
    try {
      parsedHasSeenInstructions = hasSeenInstructions
        ? (JSON.parse(hasSeenInstructions) as boolean)
        : false;
    } catch {
      parsedHasSeenInstructions = false;
    }

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
    dispatch(memoryAudioActions.setHasSeenInstructions(true));
    await AsyncStorage.setItem(HAS_SEEN_INSTRUCTIONS_KEY, JSON.stringify(true));
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
    dispatch(
      memoryAudioActions.setLoadingProgress({
        progress: 0.04,
        message: "Preparing your daily listening...",
      })
    );
    dispatch(memoryAudioActions.setError(undefined));
    dispatch(memoryAudioActions.setCurrentVerseReference(args.verseReference));
    await dispatch(
      hydrateMemoryAudioState({
        verseReference: args.verseReference,
      })
    );
    dispatch(
      memoryAudioActions.setLoadingProgress({
        progress: 0.12,
        message: "Checking available verse audio...",
      })
    );

    let verseAudioUrl = selectMemoryAudioUrl(getState() as RootState);
    if (!verseAudioUrl) {
      dispatch(
        memoryAudioActions.setLoadingProgress({
          progress: 0.2,
          message: "Fetching verse audio...",
        })
      );
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
    dispatch(
      memoryAudioActions.setLoadingProgress({
        progress: 0.28,
        message: "Starting audio build...",
      })
    );

    try {
      await startMemoryAudioSessionEngine({
        verseAudioUrl,
        recallCyclesTarget: (getState() as RootState).memoryAudio
          .recallCyclesTarget,
        getSelectedAmbientSound: () =>
          (getState() as RootState).memoryAudio.selectedAmbientSound,
        onLoadingProgress: (progress, message) => {
          dispatch(
            memoryAudioActions.setLoadingProgress({
              progress,
              message,
            })
          );
        },
        onSessionStarted: (sessionDurationSeconds) => {
          dispatch(
            memoryAudioActions.setLoadingProgress({
              progress: 1,
              message: "Starting your session...",
            })
          );
          dispatch(
            memoryAudioActions.setSessionDurationSeconds(sessionDurationSeconds)
          );
          dispatch(memoryAudioActions.setMemorySessionActive(true));
          dispatch(memoryAudioActions.setSessionPaused(false));
          dispatch(memoryAudioActions.setLoading(false));
        },
        onSpokenDurationChange: (durationSeconds) => {
          dispatch(
            memoryAudioActions.setSpokenDurationSeconds(durationSeconds)
          );
        },
        onSessionPausedChange: (isPaused) => {
          dispatch(memoryAudioActions.setSessionPaused(isPaused));
        },
        onPhaseChange: (phase, gapDuration) => {
          if (
            phase === "encoding_playing" &&
            !(getState() as RootState).memoryAudio.sessionStartedAt
          ) {
            dispatch(memoryAudioActions.setSessionStartedAt(Date.now()));
          }
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
          dispatch(memoryAudioActions.setSessionPaused(false));
          void dispatch(recordMemorySessionOutcome("completed"));
          setTimeout(() => {
            dispatch(memoryAudioActions.resetSessionToIdle());
          }, 1200);
        },
        onSessionAbandoned: () => {
          dispatch(memoryAudioActions.setSessionPhase("abandoned"));
          dispatch(memoryAudioActions.setMemorySessionActive(false));
          dispatch(memoryAudioActions.setSessionPaused(false));
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
      dispatch(memoryAudioActions.setSessionPaused(false));
    }
  }
);

export const stopMemoryAudioSession = createAsyncThunk(
  "memoryAudio/stopMemoryAudioSession",
  async () => {
    await stopMemoryAudioSessionEngine();
  }
);

export const pauseMemoryAudioSession = createAsyncThunk(
  "memoryAudio/pauseMemoryAudioSession",
  async () => {
    await pauseMemoryAudioSessionEngine();
  }
);

export const resumeMemoryAudioSession = createAsyncThunk(
  "memoryAudio/resumeMemoryAudioSession",
  async () => {
    await resumeMemoryAudioSessionEngine();
  }
);

export const seekMemoryAudioSession = createAsyncThunk(
  "memoryAudio/seekMemoryAudioSession",
  async (positionSeconds: number, { dispatch, getState }) => {
    const didSeek = await seekMemoryAudioSessionEngine(positionSeconds);
    if (!didSeek) {
      return false;
    }

    const state = getState() as RootState;
    if (!state.memoryAudio.isMemorySessionActive) {
      return true;
    }

    const maxPositionSeconds = state.memoryAudio.sessionDurationSeconds;
    const clampedPositionSeconds = Math.max(
      0,
      maxPositionSeconds > 0
        ? Math.min(positionSeconds, maxPositionSeconds)
        : positionSeconds
    );

    dispatch(
      memoryAudioActions.setSessionStartedAt(
        Date.now() - clampedPositionSeconds * 1000
      )
    );
    return true;
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
    isSessionActive:
      memoryAudio.isMemorySessionActive &&
      memoryAudio.sessionPhase !== "idle" &&
      memoryAudio.sessionPhase !== "completed" &&
      memoryAudio.sessionPhase !== "abandoned",
    isSessionPaused: memoryAudio.isSessionPaused,
    isLoading: memoryAudio.isLoading,
    hasError: memoryAudio.hasError,
    errorMessage: memoryAudio.errorMessage,
    loadingProgress: memoryAudio.loadingProgress,
    loadingMessage: memoryAudio.loadingMessage,
    selectedAmbientSound: memoryAudio.selectedAmbientSound,
    spokenDurationSeconds: memoryAudio.spokenDurationSeconds,
    hasSeenInstructions: memoryAudio.hasSeenInstructions,
    srsStatusLabel: formatRelativeReviewDate(memoryAudio.nextReviewDate),
    completionLabel:
      memoryAudio.totalSessionsCompleted === 1
        ? "1 session completed"
        : `${memoryAudio.totalSessionsCompleted} sessions completed`,
  })
);

export const memoryAudioReducer = memoryAudioSlice.reducer;
