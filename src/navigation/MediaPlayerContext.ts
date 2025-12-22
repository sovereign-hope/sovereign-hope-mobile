import React from "react";

export interface MediaPlayerContextValue {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}

// Provides media player visibility state to components that need padding
export const MediaPlayerContext = React.createContext<MediaPlayerContextValue>({
  isVisible: false,
  setIsVisible: () => {},
});

export const useMediaPlayerContext = (): MediaPlayerContextValue => {
  return React.useContext(MediaPlayerContext);
};
