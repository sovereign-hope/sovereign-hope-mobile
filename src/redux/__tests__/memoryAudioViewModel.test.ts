import { RootState } from "src/app/store";
import {
  MemoryAudioState,
  selectMemoryAudioViewModel,
} from "src/redux/memoryAudioSlice";

jest.mock("src/services/ambientAudioService", () => ({
  getCurrentAmbientSound: () => "gentle-word-endless-field",
  isAmbientSound: () => true,
}));

jest.mock("src/services/memoryAudioSrs", () => ({
  applySrsOutcome: jest.fn(),
  createInitialSrsEntry: jest.fn(),
  loadSrsEntry: jest.fn(),
  saveSrsEntry: jest.fn(),
}));

jest.mock("src/services/memoryAudioSession", () => ({
  pauseMemoryAudioSessionEngine: jest.fn(),
  resumeMemoryAudioSessionEngine: jest.fn(),
  seekMemoryAudioSessionEngine: jest.fn(),
  startMemoryAudioSessionEngine: jest.fn(),
  stopMemoryAudioSessionEngine: jest.fn(),
}));

jest.mock("src/services/notificationSchedule", () => ({
  scheduleMemoryAudioReviewNotification: jest.fn(),
}));

jest.mock("src/redux/memorySlice", () => ({
  getMemoryPassageText: jest.fn(),
  selectMemoryAudioUrl: jest.fn(),
}));

const buildState = (nextReviewDate?: string): RootState =>
  ({
    memoryAudio: {
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
      nextReviewDate,
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
    } as MemoryAudioState,
  } as RootState);

describe("selectMemoryAudioViewModel", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-13T09:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("falls back to Today label for invalid review dates", () => {
    const viewModel = selectMemoryAudioViewModel(buildState("not-a-date"));

    expect(viewModel.srsStatusLabel).toBe("Next review: Today");
  });

  it("renders Tomorrow for the next-day review date", () => {
    const viewModel = selectMemoryAudioViewModel(buildState("2026-03-14"));

    expect(viewModel.srsStatusLabel).toBe("Next review: Tomorrow");
  });
});
