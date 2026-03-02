import { useWindowDimensions } from "react-native";
import { TABLET_BREAKPOINT } from "src/style/layout";

interface TabletLayout {
  width: number;
  isTablet: boolean;
}

export const useTabletLayout = (): TabletLayout => {
  const { width } = useWindowDimensions();
  return {
    width,
    isTablet: width >= TABLET_BREAKPOINT,
  };
};
