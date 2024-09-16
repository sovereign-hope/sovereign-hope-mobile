import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, collection, getDocs } from "firebase/firestore";

export interface ActiveNotificationsState {
  notifications: Array<NotificationState>;
  dismissedNotificationIDs: Array<string>;
  isLoading: boolean;
  hasError: boolean;
}

export interface NotificationState {
  id: string;
  title: string;
  details: string;
  link?: string;
  enabled: boolean;
}

const initialState: ActiveNotificationsState = {
  notifications: [],
  dismissedNotificationIDs: [],
  isLoading: false,
  hasError: false,
};

export const storeDismissedNotificationState = createAsyncThunk(
  "notifications/storeDismissedNotificationState",
  async (dismissedNotificationIDs: Array<string>, { getState }) => {
    try {
      const jsonValue = JSON.stringify(dismissedNotificationIDs);
      await AsyncStorage.setItem(`@dismissedNotifications`, jsonValue);
    } catch (error) {
      console.error(error);
    }
    const currentState = getState() as ActiveNotificationsState;
    return currentState.notifications.filter(
      (notification) =>
        !dismissedNotificationIDs.some((id) => id == notification.id)
    );
  }
);

export const getDismissedNotificationState = createAsyncThunk(
  "notifications/getDismissedNotificationState",
  async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(`@dismissedNotifications`);
      return jsonValue ? (JSON.parse(jsonValue) as Array<string>) : [];
    } catch (error) {
      console.error(error);
    }
    return [];
  }
);

export const getNotifications = createAsyncThunk(
  "notifications/getNotifications",
  async (_, { getState }) => {
    const notifications: Array<NotificationState> = [];
    try {
      const { dismissedNotificationIDs = [] } =
        getState() as ActiveNotificationsState;
      const db = getFirestore();
      const collectionRef = collection(db, "notifications");
      const collectionSnapshot = await getDocs(collectionRef);

      if (!collectionSnapshot.empty) {
        collectionSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (
            data.enabled &&
            !dismissedNotificationIDs.some((id) => id == data.id)
          ) {
            notifications.push(doc.data() as NotificationState);
          }
        });
      }
      return notifications;
    } catch (error) {
      console.log("error", error);
      return [];
    }
  }
);

export const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // getNotifications
    builder.addCase(getNotifications.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getNotifications.fulfilled, (state, action) => {
      state.notifications = action.payload;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getNotifications.rejected, (state) => {
      state.notifications = [];
      state.isLoading = false;
      state.hasError = true;
    });

    // storeDismissedNotificationState
    builder.addCase(storeDismissedNotificationState.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(
      storeDismissedNotificationState.fulfilled,
      (state, action) => {
        state.notifications = action.payload;
        state.isLoading = false;
        state.hasError = false;
      }
    );
    builder.addCase(storeDismissedNotificationState.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });

    // getDismissedNotificationState
    builder.addCase(getDismissedNotificationState.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(
      getDismissedNotificationState.fulfilled,
      (state, action) => {
        state.dismissedNotificationIDs = action.payload;
        state.isLoading = false;
        state.hasError = false;
      }
    );
    builder.addCase(getDismissedNotificationState.rejected, (state) => {
      state.notifications = [];
      state.isLoading = false;
      state.hasError = true;
    });
  },
});

export const selectNotifications = (
  state: RootState
): Array<NotificationState> | undefined => state.notifications.notifications;

export const selectDismissedNotifications = (
  state: RootState
): Array<string> | undefined => state.notifications.dismissedNotificationIDs;

export const selectError = (state: RootState): boolean =>
  state.readingPlan.hasError;

export const selectIsLoading = (state: RootState): boolean =>
  state.readingPlan.isLoading;

export const notificationsReducer = notificationsSlice.reducer;
