/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { useEffect, useState } from "react";
import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  StatusBar,
} from "react-native";

const { StatusBarManager } = NativeModules;

export const useStatusBarHeight = () => {
  const [value, setValue] = useState(StatusBar.currentHeight || 0);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const emitter = new NativeEventEmitter(StatusBarManager);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    StatusBarManager.getHeight(({ height }: { height: number }) => {
      setValue(height);
    });
    emitter.addListener("statusBarFrameWillChange", (data) =>
      setValue(data.frame.height)
    );
  }, []);

  return value;
};
/* eslint-enable @typescript-eslint/no-unsafe-member-access */
