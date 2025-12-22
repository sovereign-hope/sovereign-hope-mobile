import React from "react";

export interface TabBarHeightContextValue {
  height: number;
  setHeight: (h: number) => void;
  measuredHeight: number;
  setMeasuredHeight: (h: number) => void;
  // Cache for immediate positioning
  cachedHeight: number;
  setCachedHeight: (h: number) => void;
  isCached: boolean;
  setIsCached: (cached: boolean) => void;
  isTabBarVisible: boolean;
  setIsTabBarVisible: (visible: boolean) => void;
}

// Provides current bottom tab bar height to components rendered outside the tab tree
export const TabBarHeightContext =
  React.createContext<TabBarHeightContextValue>({
    height: 0,
    setHeight: () => {},
    measuredHeight: 0,
    setMeasuredHeight: () => {},
    cachedHeight: 0,
    setCachedHeight: () => {},
    isCached: false,
    setIsCached: () => {},
    isTabBarVisible: true,
    setIsTabBarVisible: () => {},
  });

export const useTabBarHeightContext = (): TabBarHeightContextValue => {
  return React.useContext(TabBarHeightContext);
};
