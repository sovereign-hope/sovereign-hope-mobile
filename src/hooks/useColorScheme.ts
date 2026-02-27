import { Appearance, ColorSchemeName } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

export const useColorScheme = (delay = 500): NonNullable<ColorSchemeName> => {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | false>(false);

  const resetCurrentTimeout = useCallback(() => {
    if (timeoutRef.current !== false) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = false;
    }
  }, []);

  const onColorSchemeChange = useCallback(
    (preferences: Appearance.AppearancePreferences) => {
      resetCurrentTimeout();

      timeoutRef.current = setTimeout(() => {
        setColorScheme(preferences.colorScheme);
      }, delay);
    },
    [delay, resetCurrentTimeout]
  );

  useEffect(() => {
    const listener = Appearance.addChangeListener(onColorSchemeChange);

    return () => {
      resetCurrentTimeout();
      listener.remove();
    };
  }, [onColorSchemeChange, resetCurrentTimeout]);

  return colorScheme as NonNullable<ColorSchemeName>;
};
