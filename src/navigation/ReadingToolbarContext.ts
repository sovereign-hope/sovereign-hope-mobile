import React from "react";

export interface ReadingToolbarContextValue {
  toolbarHeight: number;
  setToolbarHeight: (h: number) => void;
  toolbarVisible: boolean;
  setToolbarVisible: (visible: boolean) => void;
}

// Provides reading toolbar layout state so MediaPlayer can position above it
export const ReadingToolbarContext =
  React.createContext<ReadingToolbarContextValue>({
    toolbarHeight: 0,
    setToolbarHeight: () => {},
    toolbarVisible: false,
    setToolbarVisible: () => {},
  });

export const useReadingToolbarContext = (): ReadingToolbarContextValue => {
  return React.useContext(ReadingToolbarContext);
};
