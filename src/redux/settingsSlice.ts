import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "src/app/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { body } from "src/style/typography";
import { applyNotificationSchedule } from "src/services/notificationSchedule";
import { writeThroughSettingsField } from "src/services/syncWriteThrough";

export interface SettingsState {
  enableNotifications: boolean;
  notificationTime: string;
  subscribedPlans: Array<string>;
  readingFontSize: number;
  readingBackgroundColor: string | undefined;
  showChildrensPlan: boolean;
  enableChurchCenterDeepLink: boolean;
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
  enableChurchCenterDeepLink: false,
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
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const storeEnableNotificationsState = createAsyncThunk(
  "settings/storeEnableNotificationsState",
  async (enableNotifications: boolean, { getState }) => {
    try {
      await AsyncStorage.setItem(
        `@settings/enableNotifications`,
        enableNotifications.toString()
      );

      const state = getState() as RootState;
      await applyNotificationSchedule(
        enableNotifications,
        state.settings.notificationTime
      );
      await writeThroughSettingsField(
        "enableNotifications",
        enableNotifications
      );
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
        await applyNotificationSchedule(true, timeString);
      }
      await writeThroughSettingsField("notificationTime", timeString);
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
  async (subscribedPlans: Array<string>) => {
    try {
      await AsyncStorage.setItem(
        "@settings/subscribedPlans",
        subscribedPlans.toString()
      );
      await writeThroughSettingsField("subscribedPlans", subscribedPlans);
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
  async (readingFontSize: number) => {
    try {
      await AsyncStorage.setItem(
        "@settings/readingFontSize",
        readingFontSize.toString()
      );
      await writeThroughSettingsField("readingFontSize", readingFontSize);
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
  async (readingBackgroundColor: string) => {
    try {
      await AsyncStorage.setItem(
        "@settings/readingBackgroundColor",
        readingBackgroundColor.toString()
      );
      await writeThroughSettingsField(
        "readingBackgroundColor",
        readingBackgroundColor
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
  async (showChildrensPlan: boolean) => {
    try {
      await AsyncStorage.setItem(
        "@settings/showChildrensPlan",
        showChildrensPlan.toString()
      );
      await writeThroughSettingsField("showChildrensPlan", showChildrensPlan);
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

export const storeEnableChurchCenterDeepLink = createAsyncThunk(
  "settings/storeEnableChurchCenterDeepLink",
  async (enableChurchCenterDeepLink: boolean) => {
    try {
      await AsyncStorage.setItem(
        "@settings/enableChurchCenterDeepLink",
        enableChurchCenterDeepLink.toString()
      );
      await writeThroughSettingsField(
        "enableChurchCenterDeepLink",
        enableChurchCenterDeepLink
      );
      return enableChurchCenterDeepLink;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
);

export const getEnableChurchCenterDeepLink = createAsyncThunk(
  "settings/getEnableChurchCenterDeepLink",
  async (): Promise<boolean> => {
    try {
      const stringValue = await AsyncStorage.getItem(
        "@settings/enableChurchCenterDeepLink"
      );

      if (!stringValue) {
        return false; // Default value if no setting exists
      }

      try {
        const parsedValue = JSON.parse(stringValue) as unknown;
        // Ensure the parsed value is actually a boolean
        return typeof parsedValue === "boolean" ? parsedValue : false;
      } catch (parseError) {
        console.error(
          "Failed to parse enableChurchCenterDeepLink value:",
          parseError
        );
        return false;
      }
    } catch (error) {
      console.error(
        "Failed to read enableChurchCenterDeepLink from storage:",
        error
      );
      return false;
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

    // storeEnableChurchCenterDeepLink
    builder.addCase(storeEnableChurchCenterDeepLink.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(
      storeEnableChurchCenterDeepLink.fulfilled,
      (state, action) => {
        state.enableChurchCenterDeepLink = action.payload ?? false;
        state.isLoading = false;
        state.hasError = false;
      }
    );
    builder.addCase(storeEnableChurchCenterDeepLink.rejected, (state) => {
      state.isLoading = false;
      state.hasError = true;
    });

    // getEnableChurchCenterDeepLink
    builder.addCase(getEnableChurchCenterDeepLink.pending, (state) => {
      state.isLoading = true;
      state.hasError = false;
    });
    builder.addCase(
      getEnableChurchCenterDeepLink.fulfilled,
      (state, action) => {
        state.enableChurchCenterDeepLink = action.payload ?? false;
        state.isLoading = false;
        state.hasError = false;
      }
    );
    builder.addCase(getEnableChurchCenterDeepLink.rejected, (state) => {
      state.enableChurchCenterDeepLink = false;
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

export const selectEnableChurchCenterDeepLink = (state: RootState): boolean =>
  state.settings.enableChurchCenterDeepLink;

export const settingsReducer = settingsSlice.reducer;
