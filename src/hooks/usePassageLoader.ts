import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { useAppDispatch } from "src/hooks/store";
import { getPassageText } from "src/redux/esvSlice";
import { getPassageCommentary } from "src/redux/commentarySlice";
import { getReadingFontSize } from "src/redux/settingsSlice";
import { Passage } from "src/app/utils";

interface PassageLoaderResult {
  passageIndex: number;
  shouldShowMemoryButton: boolean;
  heading: string;
  isNavigatingPassages: boolean;
  hasLoadedCurrentPassage: boolean;
  handleNextPassage: () => void;
  handlePreviousPassage: () => void;
}

export const usePassageLoader = (
  passages: Passage[],
  onComplete: () => void,
  onDone: () => void
): PassageLoaderResult => {
  const [passageIndex, setPassageIndex] = useState(0);
  const [shouldShowMemoryButton, setShouldShowMemoryButton] = useState(false);
  const [heading, setHeading] = useState("");
  const [isNavigatingPassages, setIsNavigatingPassages] = useState(false);
  const [hasLoadedCurrentPassage, setHasLoadedCurrentPassage] = useState(false);

  const dispatch = useAppDispatch();
  const isNavigatingPassagesRef = useRef(false);
  const pendingPassageIndexRef = useRef<number | null>(null);

  const loadPassageAtIndex = useCallback(
    async (nextPassageIndex: number): Promise<boolean> => {
      const passage = passages[nextPassageIndex];
      if (!passage) {
        return false;
      }

      if (isNavigatingPassagesRef.current) {
        pendingPassageIndexRef.current = nextPassageIndex;
        return false;
      }

      isNavigatingPassagesRef.current = true;
      setIsNavigatingPassages(true);

      try {
        const [passageAction] = await Promise.all([
          dispatch(
            getPassageText({
              passage,
              includeFootnotes: !passage.isMemory,
            })
          ),
          dispatch(getPassageCommentary({ passage })),
        ]);
        const didLoadPassage = getPassageText.fulfilled.match(passageAction);
        if (!didLoadPassage) {
          return false;
        }

        setShouldShowMemoryButton(passage.isMemory);
        setHeading(passage.heading ?? "");
        setPassageIndex(nextPassageIndex);
        setHasLoadedCurrentPassage(true);
        return true;
      } finally {
        isNavigatingPassagesRef.current = false;
        setIsNavigatingPassages(false);
      }
    },
    [dispatch, passages]
  );

  useEffect(() => {
    if (isNavigatingPassages) {
      return;
    }

    const pendingPassageIndex = pendingPassageIndexRef.current;
    if (pendingPassageIndex === null) {
      return;
    }

    // eslint-disable-next-line unicorn/no-null
    pendingPassageIndexRef.current = null;
    void loadPassageAtIndex(pendingPassageIndex);
  }, [isNavigatingPassages, loadPassageAtIndex]);

  useEffect(() => {
    if (passages.length > 0) {
      // eslint-disable-next-line unicorn/no-null
      pendingPassageIndexRef.current = null;
      setPassageIndex(0);
      setHasLoadedCurrentPassage(false);
      void loadPassageAtIndex(0);
      void dispatch(getReadingFontSize());
    }
  }, [dispatch, loadPassageAtIndex, passages]);

  const handleNextPassage = useCallback(() => {
    if (isNavigatingPassagesRef.current) {
      return;
    }

    if (passageIndex < passages.length - 1) {
      void (async () => {
        if (await loadPassageAtIndex(passageIndex + 1)) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          return;
        }

        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      })();
    } else {
      if (!hasLoadedCurrentPassage) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
      onDone();
    }
  }, [
    passageIndex,
    passages.length,
    hasLoadedCurrentPassage,
    loadPassageAtIndex,
    onComplete,
    onDone,
  ]);

  const handlePreviousPassage = useCallback(() => {
    if (isNavigatingPassagesRef.current || passageIndex <= 0) {
      return;
    }

    void (async () => {
      if (await loadPassageAtIndex(passageIndex - 1)) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    })();
  }, [passageIndex, loadPassageAtIndex]);

  return {
    passageIndex,
    shouldShowMemoryButton,
    heading,
    isNavigatingPassages,
    hasLoadedCurrentPassage,
    handleNextPassage,
    handlePreviousPassage,
  };
};
