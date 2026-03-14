import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Note } from "src/types/notes";

const STORAGE_KEY = "@notes";

const isNote = (value: unknown): value is Note =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Note).id === "string" &&
  typeof (value as Note).bookId === "string" &&
  typeof (value as Note).chapter === "number" &&
  typeof (value as Note).startVerse === "number" &&
  typeof (value as Note).endVerse === "number" &&
  typeof (value as Note).text === "string" &&
  typeof (value as Note).createdAt === "number" &&
  typeof (value as Note).updatedAt === "number";

export const loadNotesFromStorage = async (): Promise<Note[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => isNote(item));
  } catch {
    return [];
  }
};

export const saveNotesToStorage = async (notes: Note[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (error) {
    console.warn("[Notes] Failed to persist notes locally:", error);
  }
};

export const clearNotesFromStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[Notes] Failed to clear notes locally:", error);
  }
};
