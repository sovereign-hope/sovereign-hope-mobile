import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { body } from "src/style/typography";

export interface SettingsState {
  enableNotifications: boolean;
  notificationTime: string;
  subscribedPlans: Array<string>;
  readingFontSize: number;
  readingBackgroundColor: string | undefined;
  showChildrensPlan: boolean;
  isLoading: boolean;
  hasError: boolean;
  hasLoadedSubscribedPlans: boolean;
}

const defaultTimeString = "8:00 AM";

const initialState: SettingsState = {
  enableNotifications: true,
  notificationTime: defaultTimeString,
  subscribedPlans: [],
  readingFontSize: body.fontSize ?? 13,
  readingBackgroundColor: undefined,
  showChildrensPlan: true,
  isLoading: false,
  hasError: false,
  hasLoadedSubscribedPlans: false,
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

export const storeSubscribedPlans = createAsyncThunk(
  "settings/storeSubscribedPlans",
  async (subscribedPlans: Array<string>, { getState }) => {
    try {
      await AsyncStorage.setItem(
        "@settings/subscribedPlans",
        subscribedPlans.toString()
      );
      return subscribedPlans;
    } catch (error) {
      console.error(error);
      return [];
    }
  }
);

export const getSubscribedPlans = createAsyncThunk(
  "settings/getSubscribedPlans",
  async () => {
    try {
      const stringValue = await AsyncStorage.getItem(
        `@settings/subscribedPlans`
      );
      if (!stringValue) {
        return [];
      }
      const splitArray = stringValue.split(",");
      if (!splitArray) {
        return [stringValue];
      }
      return splitArray;
    } catch (error) {
      console.error(error);
    }
    return [];
  }
);

export const storeReadingFontSize = createAsyncThunk(
  "settings/storeReadingFontSize",
  async (readingFontSize: number, { getState }) => {
    try {
      await AsyncStorage.setItem(
        "@settings/readingFontSize",
        readingFontSize.toString()
      );
      return readingFontSize;
    } catch (error) {
      console.error(error);
      return body.fontSize;
    }
  }
);

export const getReadingFontSize = createAsyncThunk(
  "settings/getReadingFontSize",
  async () => {
    try {
      const stringValue = await AsyncStorage.getItem(
        `@settings/readingFontSize`
      );
      if (!stringValue) {
        return body.fontSize;
      }
      return Number.parseInt(stringValue);
    } catch (error) {
      console.error(error);
      return body.fontSize;
    }
  }
);

export const storeReadingBackgroundColor = createAsyncThunk(
  "settings/storeReadingBackgroundColor",
  async (readingBackgroundColor: string, { getState }) => {
    try {
      await AsyncStorage.setItem(
        "@settings/readingBackgroundColor",
        readingBackgroundColor.toString()
      );
      return readingBackgroundColor;
    } catch (error) {
      console.error(error);
    }
  }
);

export const getReadingBackgroundColor = createAsyncThunk(
  "settings/getReadingBackgroundColor",
  async () => {
    try {
      const stringValue = await AsyncStorage.getItem(
        `@settings/readingBackgroundColor`
      );
      return stringValue;
    } catch (error) {
      console.error(error);
    }
  }
);

export const storeShowChildrensPlan = createAsyncThunk(
  "settings/storeShowChildrensPlan",
  async (showChildrensPlan: boolean, { getState }) => {
    try {
      await AsyncStorage.setItem(
        "@settings/showChildrensPlan",
        showChildrensPlan.toString()
      );
      return showChildrensPlan;
    } catch (error) {
      console.error(error);
    }
  }
);

export const getShowChildrensPlan = createAsyncThunk(
  "settings/getShowChildrensPlan",
  async (): Promise<boolean> => {
    try {
      const stringValue = await AsyncStorage.getItem(
        "@settings/showChildrensPlan"
      );

      if (!stringValue) {
        return true; // Default value if no setting exists
      }

      try {
        const parsedValue = JSON.parse(stringValue) as unknown;
        // Ensure the parsed value is actually a boolean
        return typeof parsedValue === "boolean" ? parsedValue : true;
      } catch (parseError) {
        console.error("Failed to parse showChildrensPlan value:", parseError);
        return true;
      }
    } catch (error) {
      console.error("Failed to read showChildrensPlan from storage:", error);
      return true;
    }
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

    // storeSubscribedPlans
    builder.addCase(storeSubscribedPlans.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(storeSubscribedPlans.fulfilled, (state, action) => {
      state.subscribedPlans = action.payload;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(storeSubscribedPlans.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });

    // getSubscribedPlans
    builder.addCase(getSubscribedPlans.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getSubscribedPlans.fulfilled, (state, action) => {
      state.subscribedPlans = action.payload;
      state.isLoading = false;
      state.hasError = false;
      state.hasLoadedSubscribedPlans = true;
    });
    builder.addCase(getSubscribedPlans.rejected, (state) => {
      state.subscribedPlans = [];
      state.isLoading = false;
      state.hasError = true;
      state.hasLoadedSubscribedPlans = true;
    });

    // storeReadingFontSize
    builder.addCase(storeReadingFontSize.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(storeReadingFontSize.fulfilled, (state, action) => {
      state.readingFontSize = action.payload ?? 13;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(storeReadingFontSize.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });

    // getReadingFontSize
    builder.addCase(getReadingFontSize.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getReadingFontSize.fulfilled, (state, action) => {
      state.readingFontSize = action.payload ?? 13;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getReadingFontSize.rejected, (state) => {
      state.readingFontSize = 13;
      state.isLoading = false;
      state.hasError = true;
    });

    // storeReadingBackgroundColor
    builder.addCase(storeReadingBackgroundColor.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(storeReadingBackgroundColor.fulfilled, (state, action) => {
      state.readingBackgroundColor = action.payload;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(storeReadingBackgroundColor.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });

    // getReadingBackgroundColor
    builder.addCase(getReadingBackgroundColor.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(getReadingBackgroundColor.fulfilled, (state, action) => {
      state.readingBackgroundColor = action.payload ?? undefined;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(getReadingBackgroundColor.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });

    // storeShowChildrensPlan
    builder.addCase(storeShowChildrensPlan.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(storeShowChildrensPlan.fulfilled, (state, action) => {
      state.showChildrensPlan = action.payload ?? false;
      state.isLoading = false;
      state.hasError = false;
    });
    builder.addCase(storeShowChildrensPlan.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });
  },
});

export const selectEnableNotifications = (state: RootState): boolean =>
  state.settings.enableNotifications;

export const selectNotificationTime = (state: RootState): string =>
  state.settings.notificationTime;

export const selectSubscribedPlans = (state: RootState): Array<string> =>
  state.settings.subscribedPlans;

export const selectHasLoadedSubscribedPlans = (state: RootState): boolean =>
  state.settings.hasLoadedSubscribedPlans;

export const selectReadingFontSize = (state: RootState): number =>
  state.settings.readingFontSize;

export const selectReadingBackgroundColor = (
  state: RootState
): string | undefined => state.settings.readingBackgroundColor;

export const selectError = (state: RootState): boolean =>
  state.settings.hasError;

export const selectIsLoading = (state: RootState): boolean =>
  state.settings.isLoading;

export const selectShowChildrensPlan = (state: RootState): boolean =>
  state.settings.showChildrensPlan;

export const settingsReducer = settingsSlice.reducer;
