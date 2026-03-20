import { Platform } from "react-native";

interface VerseHitTestModuleType {
  getVerseAtPoint(x: number, y: number): Promise<number>;
}

let VerseHitTest: VerseHitTestModuleType | undefined;
if (Platform.OS === "ios" || Platform.OS === "android") {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports, unicorn/prefer-module, @typescript-eslint/no-var-requires */
    const { requireNativeModule } = require("expo-modules-core") as {
      requireNativeModule: (name: string) => VerseHitTestModuleType;
    };
    /* eslint-enable @typescript-eslint/no-require-imports, unicorn/prefer-module, @typescript-eslint/no-var-requires */
    VerseHitTest = requireNativeModule("VerseHitTest");
  } catch {
    // Native module not available — needs a dev client rebuild
  }
}

/**
 * Find the verse number at the given screen point using native text
 * hit testing. Returns the verse number (1-based) or a negative error code.
 *
 * Uses Core Text / NSLayoutManager on iOS — the same hit testing
 * that React Native uses internally for onPressIn.
 *
 * Returns -1 if the native module is unavailable.
 */
export const getVerseAtPoint = (
  pageX: number,
  pageY: number
): Promise<number> =>
  VerseHitTest
    ? VerseHitTest.getVerseAtPoint(pageX, pageY)
    : Promise.resolve(-1);
