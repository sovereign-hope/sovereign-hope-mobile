import { useContext } from "react";
import { TabBarHeightContext } from "src/navigation/TabBarContext";
import { MediaPlayerContext } from "src/navigation/MediaPlayerContext";

export const useMiniPlayerHeight = (): number => {
  const { height: tabBarHeight } = useContext(TabBarHeightContext);
  const { isVisible } = useContext(MediaPlayerContext);

  // Only show padding when media player is actually visible
  if (!isVisible) {
    return 0;
  }

  // Mini player height is approximately 80px + some padding
  const MINI_PLAYER_HEIGHT = 80;
  const PADDING = 8;

  // If tab bar is hidden (stack screen), mini player sits at bottom with safe area
  if (tabBarHeight === 0) {
    return MINI_PLAYER_HEIGHT + PADDING;
  }

  // If tab bar is visible, mini player floats above it
  return MINI_PLAYER_HEIGHT + PADDING;
};
