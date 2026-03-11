import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Highlight } from "src/types/highlights";

const STORAGE_KEY = "@highlights";

export const loadHighlightsFromStorage = async (): Promise<Highlight[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Highlight[];
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
