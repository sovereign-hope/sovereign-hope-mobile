import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface SettingsState {
  enableNotifications: boolean;
  notificationTime: string;
  isLoading: boolean;
  hasError: boolean;
}

const defaultTimeString = "8:00 AM";

const initialState: SettingsState = {
  enableNotifications: true,
  notificationTime: defaultTimeString,
  isLoading: false,
  hasError: false,
};

Notifications.setNotificationHandler({
  // eslint-disable-next-line @typescript-eslint/require-await
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const getSecondsUntilNextOccuranceOfTime = (time: string) => {
  //d = new Date(); -- temporary to test different dates
  let hour = Number.parseInt(time.split(":")[0]);
  const minute = Number.parseInt(time.split(":")[1].split(" ")[0]);
  const ampm = time.split(":")[1].split(" ")[1];
  console.log(hour, minute, ampm);

  if (ampm === "PM" && hour !== 12) {
    hour += 12;
  }

  if (hour === 24) {
    hour = 0;
  }

  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (d < new Date()) {
    d.setDate(d.getDate() + 1);
  }
  const now = new Date();
  return d.getTime() / 1000 - now.getTime() / 1000;
};

export const storeEnableNotificationsState = createAsyncThunk(
  "settings/storeEnableNotificationsState",
  async (enableNotifications: boolean, { getState }) => {
    try {
      await AsyncStorage.setItem(
        `@settings/enableNotifications`,
        enableNotifications.toString()
      );

      if (enableNotifications) {
        const state = getState() as RootState;
        const time = state.settings.notificationTime;
        let hour = Number.parseInt(time.split(":")[0]);
        const minute = Number.parseInt(time.split(":")[1].split(" ")[0]);
        const ampm = time.split(":")[1].split(" ")[1];
        console.log(hour, minute, ampm);

        if (ampm === "PM" && hour !== 12) {
          hour += 12;
        }

        if (hour === 24) {
          hour = 0;
        }

        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Read now to stay on track with your Bible reading plan!",
          },
          trigger: {
            repeats: true,
            hour,
            minute,
          },
        });
      } else {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
    } catch (error) {
      console.error(error);
    }
    return enableNotifications;
  }
);

export const getEnableNotificationsState = createAsyncThunk(
  "settings/getEnableNotificationsState",
  async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(
        `@settings/enableNotifications`
      );
      return jsonValue ? (JSON.parse(jsonValue) as boolean) : true;
    } catch (error) {
      console.error(error);
    }
    return true;
  }
);

export const storeNotificationTime = createAsyncThunk(
  "settings/storeNotificationTime",
  async (notificationTime: Date, { getState }) => {
    try {
      const state = getState() as RootState;
      const timeString = notificationTime.toLocaleTimeString("en-US", {
        hour12: true,
        hour: "numeric",
        minute: "numeric",
      });
      await AsyncStorage.setItem(`@settings/notificationTime`, timeString);

      if (state.settings.enableNotifications) {
        const time = timeString;
        let hour = Number.parseInt(time.split(":")[0]);
        const minute = Number.parseInt(time.split(":")[1].split(" ")[0]);
        const ampm = time.split(":")[1].split(" ")[1];
        console.log(hour, minute, ampm);

        if (ampm === "PM" && hour !== 12) {
          hour += 12;
        }

        if (hour === 24) {
          hour = 0;
        }

        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Have you read today?",
            subtitle: "Read now to stay on track with your Bible reading plan!",
          },
          trigger: {
            repeats: true,
            hour,
            minute,
          },
        });
      }
    } catch (error) {
      console.error(error);
    }
    return notificationTime.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "numeric",
    });
  }
);

export const getNotificationTime = createAsyncThunk(
  "settings/getNotificationTime",
  async () => {
    try {
      const stringValue = await AsyncStorage.getItem(
        `@settings/notificationTime`
      );
      return stringValue;
    } catch (error) {
      console.error(error);
    }
    return defaultTimeString;
  }
);

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // storeEnableNotificationsState
    builder.addCase(storeEnableNotificationsState.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(
      storeEnableNotificationsState.fulfilled,
      (state, action) => {
        state.enableNotifications = action.payload;
        state.isLoading = false;
        state.hasError = false;
      }
    );
    builder.addCase(storeEnableNotificationsState.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });

    // getEnableNotificationsState
    builder.addCase(getEnableNotificationsState.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getEnableNotificationsState.fulfilled, (state, action) => {
      state.enableNotifications = action.payload;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getEnableNotificationsState.rejected, (state) => {
      state.enableNotifications = true;
      state.isLoading = false;
      state.hasError = true;
    });

    // storeNotificationTime
    builder.addCase(storeNotificationTime.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(storeNotificationTime.fulfilled, (state, action) => {
      state.notificationTime = action.payload;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(storeNotificationTime.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });

    // getNotificationTime
    builder.addCase(getNotificationTime.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getNotificationTime.fulfilled, (state, action) => {
      state.notificationTime = action.payload || defaultTimeString;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getNotificationTime.rejected, (state) => {
      state.notificationTime = defaultTimeString;
      state.isLoading = false;
      state.hasError = true;
    });
  },
});

export const selectEnableNotifications = (state: RootState): boolean =>
  state.settings.enableNotifications;

export const selectNotificationTime = (state: RootState): string =>
  state.settings.notificationTime;

export const selectError = (state: RootState): boolean =>
  state.settings.hasError;

export const selectIsLoading = (state: RootState): boolean =>
  state.settings.isLoading;

export const settingsReducer = settingsSlice.reducer;
