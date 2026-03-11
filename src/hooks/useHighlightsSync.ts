import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { selectAuthUser } from "src/redux/authSlice";
import { setHighlights } from "src/redux/highlightsSlice";
import { subscribeToHighlights } from "src/services/highlights";

/**
 * Subscribe to the user's highlights in Firestore.
 * Mount this once in a top-level component (e.g. RootScreen).
 */
export const useHighlightsSync = (): void => {
  const user = useAppSelector(selectAuthUser);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!user?.uid) {
      dispatch(setHighlights([]));
      return;
    }

    const unsubscribe = subscribeToHighlights(user.uid, (highlights) => {
      dispatch(setHighlights(highlights));
    });

    return unsubscribe;
  }, [dispatch, user?.uid]);
};
