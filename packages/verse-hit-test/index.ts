import { Platform } from "react-native";

interface VerseHitTestModuleType {
  getVerseAtPoint(x: number, y: number): Promise<number>;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
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
 * Find the verse number at the given screen point using native text-run
 * hit testing. Returns the verse number (1-based) or -1 if no verse
 * was found at that position.
 *
 * Uses the same Core Text / NSLayoutManager hit testing that React
 * Native's onPressIn uses internally, ensuring accurate results even
 * for inline text runs within Fabric paragraph components.
 *
 * Returns -1 on Android or if the native module is unavailable.
 */
export const getVerseAtPoint = (
  pageX: number,
  pageY: number
): Promise<number> =>
  VerseHitTest
    ? VerseHitTest.getVerseAtPoint(pageX, pageY)
    : Promise.resolve(-1);
