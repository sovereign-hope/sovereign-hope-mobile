import AsyncStorage from "@react-native-async-storage/async-storage";

export const SRS_INTERVALS = [0, 1, 3, 7, 14, 30];

export type MemoryAudioOutcome = "completed" | "abandoned" | "skipped";

export interface SRSEntry {
  verseReference: string;
  verseKey: string;
  currentInterval: number;
  nextReviewDate: string;
  totalCompletions: number;
  totalAbandoned: number;
  lastSessionDate: string;
  createdAt: string;
  lastCompletionAdvancedDate?: string;
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0
  );
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getNextCompletionInterval = (currentInterval: number): number => {
  const currentIndex = SRS_INTERVALS.indexOf(currentInterval);
  if (currentIndex === -1) {
    const fallback = SRS_INTERVALS.find(
      (interval) => interval > currentInterval
    );
    return fallback ?? SRS_INTERVALS.at(-1) ?? currentInterval;
  }
  return SRS_INTERVALS[Math.min(currentIndex + 1, SRS_INTERVALS.length - 1)];
};

const getCompressedInterval = (currentInterval: number): number =>
  Math.max(1, Math.floor(currentInterval / 2));

export const calculateNextReviewDate = (
  currentInterval: number,
  outcome: MemoryAudioOutcome,
  baseDate: Date = new Date()
): { nextInterval: number; nextDate: string } => {
  const nextInterval =
    outcome === "completed"
      ? getNextCompletionInterval(currentInterval)
      : getCompressedInterval(currentInterval);
  const nextDate = formatLocalDate(addDays(baseDate, nextInterval));
  return {
    nextInterval,
    nextDate,
  };
};

export const getVerseKey = (verseReference: string): string =>
  verseReference
    .trim()
    .toLowerCase()
    .replaceAll(/[^\da-z]+/g, "-")
    .replaceAll(/^-|-$/g, "");

export const getSrsStorageKey = (verseKey: string): string =>
  `@memoryAudio/srs/${verseKey}`;

export const createInitialSrsEntry = (
  verseReference: string,
  createdAt: Date = new Date()
): SRSEntry => {
  const verseKey = getVerseKey(verseReference);
  const today = formatLocalDate(createdAt);
  return {
    verseReference,
    verseKey,
    currentInterval: 0,
    nextReviewDate: today,
    totalCompletions: 0,
    totalAbandoned: 0,
    lastSessionDate: today,
    createdAt: today,
  };
};

export const loadSrsEntry = async (
  verseReference: string
): Promise<SRSEntry | undefined> => {
  const storageKey = getSrsStorageKey(getVerseKey(verseReference));
  const rawValue = await AsyncStorage.getItem(storageKey);
  return rawValue ? (JSON.parse(rawValue) as SRSEntry) : undefined;
};

export const saveSrsEntry = async (entry: SRSEntry): Promise<void> => {
  await AsyncStorage.setItem(
    getSrsStorageKey(entry.verseKey),
    JSON.stringify(entry)
  );
};

export const applySrsOutcome = (
  existingEntry: SRSEntry | undefined,
  verseReference: string,
  outcome: MemoryAudioOutcome,
  now: Date = new Date()
): SRSEntry => {
  const baseEntry = existingEntry ?? createInitialSrsEntry(verseReference, now);
  const today = formatLocalDate(now);

  if (
    outcome === "completed" &&
    baseEntry.lastCompletionAdvancedDate === today
  ) {
    return {
      ...baseEntry,
      totalCompletions: baseEntry.totalCompletions + 1,
      lastSessionDate: today,
    };
  }

  const { nextDate, nextInterval } = calculateNextReviewDate(
    baseEntry.currentInterval,
    outcome,
    now
  );

  return {
    ...baseEntry,
    currentInterval: nextInterval,
    nextReviewDate: nextDate,
    lastSessionDate: today,
    totalCompletions:
      outcome === "completed"
        ? baseEntry.totalCompletions + 1
        : baseEntry.totalCompletions,
    totalAbandoned:
      outcome === "abandoned"
        ? baseEntry.totalAbandoned + 1
        : baseEntry.totalAbandoned,
    lastCompletionAdvancedDate:
      outcome === "completed" ? today : baseEntry.lastCompletionAdvancedDate,
  };
};
