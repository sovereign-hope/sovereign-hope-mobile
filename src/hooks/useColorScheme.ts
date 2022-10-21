import { Appearance, ColorSchemeName } from "react-native";
import { useEffect, useRef, useState } from "react";

export const useColorScheme = (delay = 500): NonNullable<ColorSchemeName> => {
  const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
  const [listener, setListener] =
    useState<ReturnType<typeof Appearance.addChangeListener>>();

  let timeout = useRef<NodeJS.Timeout | null>(null).current;

  useEffect(() => {
    setListener(Appearance.addChangeListener(onColorSchemeChange));

    return () => {
      resetCurrentTimeout();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      listener?.remove();
    };
  }, []);

  function onColorSchemeChange(preferences: Appearance.AppearancePreferences) {
    resetCurrentTimeout();

    timeout = setTimeout(() => {
      setColorScheme(preferences.colorScheme);
    }, delay);
  }

  function resetCurrentTimeout() {
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  return colorScheme as NonNullable<ColorSchemeName>;
};
