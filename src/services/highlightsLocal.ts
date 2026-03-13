import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Highlight } from "src/types/highlights";

const STORAGE_KEY = "@highlights";

const isHighlight = (value: unknown): value is Highlight =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Highlight).id === "string" &&
  typeof (value as Highlight).bookId === "string" &&
  typeof (value as Highlight).chapter === "number" &&
  typeof (value as Highlight).startVerse === "number" &&
  typeof (value as Highlight).endVerse === "number" &&
  typeof (value as Highlight).color === "string";

export const loadHighlightsFromStorage = async (): Promise<Highlight[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => isHighlight(item));
  } catch {
    return [];
  }
};

export const saveHighlightsToStorage = async (
  highlights: Highlight[]
): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(highlights));
  } catch (error) {
    console.warn("[Highlights] Failed to persist highlights locally:", error);
  }
};

export const clearHighlightsFromStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[Highlights] Failed to clear highlights locally:", error);
  }
};
