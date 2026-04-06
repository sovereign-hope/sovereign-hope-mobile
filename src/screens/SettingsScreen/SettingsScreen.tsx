import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector, useAppDispatch } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import {
  getEnableNotificationsState,
  getNotificationTime,
  selectEnableNotifications,
  selectNotificationTime,
  storeEnableNotificationsState,
  storeNotificationTime,
  getShowChildrensPlan,
  selectEnableChurchCenterDeepLink,
  storeEnableChurchCenterDeepLink,
  getEnableChurchCenterDeepLink,
  getEnableEinkMode,
  selectEnableEinkMode,
  selectEnableSplitView,
  storeEnableEinkMode,
  storeEnableSplitView,
  getHighlightPickerSide,
  selectHighlightPickerSide,
  storeHighlightPickerSide,
  getOverrideSystemTheme,
  selectOverrideSystemTheme,
  storeOverrideSystemTheme,
  getDarkModeEnabled,
  selectDarkModeEnabled,
  storeDarkModeEnabled,
  getDarkModeScheduleEnabled,
  selectDarkModeScheduleEnabled,
  storeDarkModeScheduleEnabled,
  getDarkModeScheduleStartMinutes,
  selectDarkModeScheduleStartMinutes,
  storeDarkModeScheduleStartMinutes,
  getDarkModeScheduleEndMinutes,
  selectDarkModeScheduleEndMinutes,
  storeDarkModeScheduleEndMinutes,
} from "src/redux/settingsSlice";
import { styles } from "./SettingsScreen.styles";
import { ScrollView } from "react-native-gesture-handler";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
  selectAvailablePlans,
  selectReadingPlan,
} from "src/redux/readingPlanSlice";
import { SecureInput } from "src/components/SecureInput/SecureInput";
import {
  clearAuthError,
  deleteAccount,
  selectAuthErrorMessage,
  selectAuthIsInitialized,
  selectAuthIsLoading,
  selectAuthIsSyncing,
  selectAuthUser,
  signOut,
} from "src/redux/authSlice";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import { spacing } from "src/style/layout";
import { getPressFeedbackStyle } from "src/style/eink";
import { useUiPreferences } from "src/hooks/useUiPreferences";
import { useNotesExportActions } from "src/hooks/useNotesExportActions";
import {
  dateToMinutesOfDay,
  formatMinutesOfDay,
  minutesOfDayToDate,
} from "src/style/themeMode";
import { getDateFromTimeString } from "./timeParsing";
import {
  selectIsNotesExportConnected,
  selectNotesExportDocumentTitle,
  selectNotesExportGoogleAccountEmail,
  selectNotesExportLastError,
  selectNotesExportLastSyncedAt,
  selectNotesExportStatus,
} from "src/redux/notesExportSlice";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "Settings" | "SettingsView"
>;

export const SettingsScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const miniPlayerHeight = useMiniPlayerHeight();
  const insets = useSafeAreaInsets();
  const enableNotifications = useAppSelector(selectEnableNotifications);
  const notificationTime = useAppSelector(selectNotificationTime);
  const readingPlan = useAppSelector(selectReadingPlan);
  const availablePlans = useAppSelector(selectAvailablePlans);
  const enableChurchCenterDeepLink = useAppSelector(
    selectEnableChurchCenterDeepLink
  );
  const enableEinkMode = useAppSelector(selectEnableEinkMode);
  const enableSplitView = useAppSelector(selectEnableSplitView);
  const highlightPickerSide = useAppSelector(selectHighlightPickerSide);
  const overrideSystemTheme = useAppSelector(selectOverrideSystemTheme);
  const darkModeEnabled = useAppSelector(selectDarkModeEnabled);
  const darkModeScheduleEnabled = useAppSelector(selectDarkModeScheduleEnabled);
  const darkModeScheduleStartMinutes = useAppSelector(
    selectDarkModeScheduleStartMinutes
  );
  const darkModeScheduleEndMinutes = useAppSelector(
    selectDarkModeScheduleEndMinutes
  );
  const authUser = useAppSelector(selectAuthUser);
  const authIsInitialized = useAppSelector(selectAuthIsInitialized);
  const authIsLoading = useAppSelector(selectAuthIsLoading);
  const authIsSyncing = useAppSelector(selectAuthIsSyncing);
  const authErrorMessage = useAppSelector(selectAuthErrorMessage);
  const notesExportStatus = useAppSelector(selectNotesExportStatus);
  const notesExportDocumentTitle = useAppSelector(
    selectNotesExportDocumentTitle
  );
  const notesExportGoogleAccountEmail = useAppSelector(
    selectNotesExportGoogleAccountEmail
  );
  const notesExportLastSyncedAt = useAppSelector(selectNotesExportLastSyncedAt);
  const notesExportLastError = useAppSelector(selectNotesExportLastError);
  const isNotesExportConnected = useAppSelector(selectIsNotesExportConnected);
  const uiPreferences = useUiPreferences();
  const {
    connect: connectNotesExport,
    disconnect: disconnectNotesExport,
    syncNow: syncNotesExportNow,
    isWorking: isNotesExportWorking,
  } = useNotesExportActions();

  // Ref Hooks

  // State hooks
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isDarkModeStartPickerVisible, setIsDarkModeStartPickerVisible] =
    useState(false);
  const [isDarkModeEndPickerVisible, setIsDarkModeEndPickerVisible] =
    useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeletePasswordPromptVisible, setIsDeletePasswordPromptVisible] =
    useState(false);

  // Callback hooks

  // Effect hooks
  useEffect(() => {
    void dispatch(getEnableNotificationsState());
    void dispatch(getNotificationTime());
    void dispatch(getShowChildrensPlan());
    void dispatch(getEnableChurchCenterDeepLink());
    void dispatch(getEnableEinkMode());
    void dispatch(getHighlightPickerSide());
    void dispatch(getOverrideSystemTheme());
    void dispatch(getDarkModeEnabled());
    void dispatch(getDarkModeScheduleEnabled());
    void dispatch(getDarkModeScheduleStartMinutes());
    void dispatch(getDarkModeScheduleEndMinutes());
  }, [dispatch]);

  // Event handlers
  const handleToggleNotifications = (value: boolean) => {
    void dispatch(storeEnableNotificationsState(value));
  };

  const handleToggleChurchCenterDeepLink = (value: boolean) => {
    void dispatch(storeEnableChurchCenterDeepLink(value));
  };

  const handleSetNotificationTime = (value: Date) => {
    void dispatch(storeNotificationTime(value));
    setIsDatePickerVisible(false);
  };

  const handleToggleEinkMode = (value: boolean) => {
    void dispatch(storeEnableEinkMode(value));
  };

  const handleToggleSplitView = (value: boolean) => {
    void dispatch(storeEnableSplitView(value));
  };

  const handleToggleHighlightPickerSide = () => {
    void dispatch(
      storeHighlightPickerSide(
        highlightPickerSide === "left" ? "right" : "left"
      )
    );
  };

  const handleToggleOverrideSystemTheme = (value: boolean) => {
    void dispatch(storeOverrideSystemTheme(value));
  };

  const handleToggleDarkModeEnabled = (value: boolean) => {
    void dispatch(storeDarkModeEnabled(value));
  };

  const handleToggleDarkModeScheduleEnabled = (value: boolean) => {
    void dispatch(storeDarkModeScheduleEnabled(value));
  };

  const handleSetDarkModeScheduleStart = (value: Date) => {
    void dispatch(storeDarkModeScheduleStartMinutes(dateToMinutesOfDay(value)));
    setIsDarkModeStartPickerVisible(false);
  };

  const handleSetDarkModeScheduleEnd = (value: Date) => {
    void dispatch(storeDarkModeScheduleEndMinutes(dateToMinutesOfDay(value)));
    setIsDarkModeEndPickerVisible(false);
  };

  const showSelectReadingPlan = () => {
    navigation.push("Available Plans");
  };

  const showSelectFontSize = () => {
    navigation.push("Font Size");
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Keep data on this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Keep Data",
        onPress: () => {
          void dispatch(signOut({ clearLocalData: false }));
        },
      },
      {
        text: "Remove Data",
        style: "destructive",
        onPress: () => {
          void dispatch(signOut({ clearLocalData: true }));
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    const providerIds = authUser?.providerIds ?? [];
    if (providerIds.includes("password")) {
      setDeletePassword("");
      setIsDeletePasswordPromptVisible(true);
      return;
    }

    Alert.alert(
      "Delete Account",
      "This will permanently delete your synced data and account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            const reauth = providerIds.includes("apple.com")
              ? ({ useAppleSignIn: true } as const)
              : providerIds.includes("google.com")
              ? ({ useGoogleSignIn: true } as const)
              : undefined;
            void dispatch(deleteAccount({ reauth, clearLocalData: true }));
          },
        },
      ]
    );
  };

  const showAccountSignIn = () => {
    navigation.push("Account Sign In");
  };

  const handleConnectNotesExport = () => {
    void connectNotesExport();
  };

  const handleReconnectNotesExport = () => {
    void connectNotesExport();
  };

  const handleCreateNewNotesExportDocument = () => {
    Alert.alert(
      "Create New Google Doc",
      "This creates a new Google Doc target for future exports. The previous Google Doc will not be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create New",
          onPress: () => {
            void connectNotesExport({ createNewDocument: true });
          },
        },
      ]
    );
  };

  const handleSyncNotesExportNow = () => {
    void syncNotesExportNow();
  };

  const handleDisconnectNotesExport = () => {
    Alert.alert(
      "Disconnect Google Docs",
      "This stops future note exports on this device. The shared Google Doc target will stay available for reconnecting later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            void disconnectNotesExport();
          },
        },
      ]
    );
  };

  // Constants
  const themedStyles = styles({ theme, isEinkMode: uiPreferences.isEinkMode });
  const isSignedIn = Boolean(authUser);
  const isBusy = authIsLoading || authIsSyncing;
  const isNotesExportBusy =
    isNotesExportWorking ||
    notesExportStatus === "connecting" ||
    notesExportStatus === "syncing";
  const useInsetSettingsGroups =
    Platform.OS === "ios" || Platform.OS === "android";
  const settingsBottomPadding =
    miniPlayerHeight + insets.bottom + spacing.large;
  const notesExportStatusLabel = isNotesExportConnected
    ? notesExportStatus === "syncing"
      ? "Syncing notes to Google Docs…"
      : "Google Docs export connected"
    : notesExportStatus === "needsReconnect"
    ? "Reconnect Google Docs to resume note export."
    : notesExportStatus === "error"
    ? "Google Docs export hit an error."
    : "Export your notes into a single Google Doc while the app is open.";
  const notesExportLastSyncedLabel = notesExportLastSyncedAt
    ? new Date(notesExportLastSyncedAt).toLocaleString()
    : "Never";

  return (
    <SafeAreaView edges={["left", "right"]} style={themedStyles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={16}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          scrollIndicatorInsets={{ bottom: settingsBottomPadding }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: settingsBottomPadding,
          }}
        >
          <Text style={themedStyles.settingsSectionHeader}>Notifications</Text>
          <View
            style={
              useInsetSettingsGroups ? themedStyles.settingsGroup : undefined
            }
          >
            <View
              style={[
                themedStyles.settingsRow,
                useInsetSettingsGroups && themedStyles.settingsRowGrouped,
              ]}
            >
              <Text style={themedStyles.settingsRowText}>
                Daily Reading Notifications
              </Text>
              <Switch
                onValueChange={handleToggleNotifications}
                value={enableNotifications}
              />
            </View>

            <Pressable
              onPress={() => setIsDatePickerVisible(true)}
              accessibilityRole="button"
              style={({ pressed }) => [
                themedStyles.settingsRow,
                useInsetSettingsGroups && themedStyles.settingsRowGrouped,
                useInsetSettingsGroups && themedStyles.settingsRowGroupedLast,
                pressed && themedStyles.settingsRowPressed,
              ]}
            >
              <Text style={themedStyles.settingsRowText}>
                Notification Time
              </Text>
              <View style={themedStyles.settingsRowValueContainer}>
                <Text style={themedStyles.settingsRowText}>
                  {notificationTime}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.border}
                  style={themedStyles.disclosureIcon}
                />
              </View>
              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="time"
                date={getDateFromTimeString(notificationTime)}
                onConfirm={handleSetNotificationTime}
                onCancel={() => setIsDatePickerVisible(false)}
              />
            </Pressable>
          </View>

          <Text style={themedStyles.settingsSectionHeader}>Reading</Text>
          <View
            style={
              useInsetSettingsGroups ? themedStyles.settingsGroup : undefined
            }
          >
            {availablePlans.length > 1 && (
              <Pressable
                onPress={showSelectReadingPlan}
                accessibilityRole="button"
                style={({ pressed }) => [
                  themedStyles.settingsRow,
                  useInsetSettingsGroups && themedStyles.settingsRowGrouped,
                  pressed && themedStyles.settingsRowPressed,
                ]}
              >
                <Text style={themedStyles.settingsRowText}>Reading Plan</Text>
                <View style={themedStyles.settingsRowValueContainer}>
                  <Text style={themedStyles.settingsRowText}>
                    {readingPlan?.title}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={theme.colors.border}
                    style={themedStyles.disclosureIcon}
                  />
                </View>
              </Pressable>
            )}

            <Pressable
              onPress={showSelectFontSize}
              accessibilityRole="button"
              style={({ pressed }) => [
                themedStyles.settingsRow,
                useInsetSettingsGroups && themedStyles.settingsRowGrouped,
                useInsetSettingsGroups && themedStyles.settingsRowGroupedLast,
                pressed && themedStyles.settingsRowPressed,
              ]}
            >
              <Text style={themedStyles.settingsRowText}>
                Reading Font Size
              </Text>
              <View style={themedStyles.settingsRowValueContainer}>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.border}
                  style={themedStyles.disclosureIcon}
                />
              </View>
            </Pressable>
          </View>

          <Text style={themedStyles.settingsSectionHeader}>Display</Text>
          <View
            style={
              useInsetSettingsGroups ? themedStyles.settingsGroup : undefined
            }
          >
            <View
              style={[
                themedStyles.settingsRow,
                useInsetSettingsGroups && themedStyles.settingsRowGrouped,
              ]}
            >
              <View style={themedStyles.settingsRowTextContainer}>
                <Text style={themedStyles.settingsRowText}>
                  Override System Theme
                </Text>
                <Text style={themedStyles.settingsRowSubtext}>
                  Apply app light/dark mode settings instead of following your
                  device theme.
                </Text>
              </View>
              <Switch
                onValueChange={handleToggleOverrideSystemTheme}
                value={overrideSystemTheme}
              />
            </View>

            {overrideSystemTheme && (
              <View
                style={[
                  themedStyles.settingsRow,
                  useInsetSettingsGroups && themedStyles.settingsRowGrouped,
                ]}
              >
                <View style={themedStyles.settingsRowTextContainer}>
                  <Text style={themedStyles.settingsRowText}>
                    Dark Schedule
                  </Text>
                  <Text style={themedStyles.settingsRowSubtext}>
                    Automatically enable dark mode between selected hours.
                  </Text>
                </View>
                <Switch
                  onValueChange={handleToggleDarkModeScheduleEnabled}
                  value={darkModeScheduleEnabled}
                />
              </View>
            )}

            {overrideSystemTheme && !darkModeScheduleEnabled && (
              <View
                style={[
                  themedStyles.settingsRow,
                  useInsetSettingsGroups && themedStyles.settingsRowGrouped,
                ]}
              >
                <Text style={themedStyles.settingsRowText}>Dark Mode</Text>
                <Switch
                  onValueChange={handleToggleDarkModeEnabled}
                  value={darkModeEnabled}
                />
              </View>
            )}

            {overrideSystemTheme && darkModeScheduleEnabled && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsDarkModeStartPickerVisible(true)}
                style={({ pressed }) => [
                  themedStyles.settingsRow,
                  useInsetSettingsGroups && themedStyles.settingsRowGrouped,
                  pressed && themedStyles.settingsRowPressed,
                ]}
              >
                <Text style={themedStyles.settingsRowText}>
                  Dark Mode Starts
                </Text>
                <View style={themedStyles.settingsRowValueContainer}>
                  <Text style={themedStyles.settingsRowText}>
                    {formatMinutesOfDay(darkModeScheduleStartMinutes)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={theme.colors.border}
                    style={themedStyles.disclosureIcon}
                  />
                </View>
              </Pressable>
            )}

            {overrideSystemTheme && darkModeScheduleEnabled && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsDarkModeEndPickerVisible(true)}
                style={({ pressed }) => [
                  themedStyles.settingsRow,
                  useInsetSettingsGroups && themedStyles.settingsRowGrouped,
                  pressed && themedStyles.settingsRowPressed,
                ]}
              >
                <Text style={themedStyles.settingsRowText}>Dark Mode Ends</Text>
                <View style={themedStyles.settingsRowValueContainer}>
                  <Text style={themedStyles.settingsRowText}>
                    {formatMinutesOfDay(darkModeScheduleEndMinutes)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={theme.colors.border}
                    style={themedStyles.disclosureIcon}
                  />
                </View>
              </Pressable>
            )}

            <View
              style={[
                themedStyles.settingsRow,
                useInsetSettingsGroups && themedStyles.settingsRowGrouped,
              ]}
            >
              <View style={themedStyles.settingsRowTextContainer}>
                <Text style={themedStyles.settingsRowText}>E-Ink Mode</Text>
                <Text style={themedStyles.settingsRowSubtext}>
                  Disable animations and transparency, increase contrast, and
                  draw strong outlines for readability.
                </Text>
              </View>
              <Switch
                onValueChange={handleToggleEinkMode}
                value={enableEinkMode}
              />
            </View>

            {Platform.OS === "ios" && (Platform as { isPad?: boolean }).isPad && (
              <View
                style={[
                  themedStyles.settingsRow,
                  useInsetSettingsGroups && themedStyles.settingsRowGrouped,
                ]}
              >
                <View style={themedStyles.settingsRowTextContainer}>
                  <Text style={themedStyles.settingsRowText}>
                    Split View Reading
                  </Text>
                  <Text style={themedStyles.settingsRowSubtext}>
                    Show daily readings in a side panel instead of a full
                    screen.
                  </Text>
                </View>
                <Switch
                  onValueChange={handleToggleSplitView}
                  value={enableSplitView}
                />
              </View>
            )}

            <Pressable
              onPress={handleToggleHighlightPickerSide}
              accessibilityRole="button"
              accessibilityLabel="Highlight Picker Side"
              accessibilityHint="Toggles highlight color picker between left and right side"
              style={[
                themedStyles.settingsRow,
                useInsetSettingsGroups && themedStyles.settingsRowGrouped,
                useInsetSettingsGroups && themedStyles.settingsRowGroupedLast,
              ]}
            >
              <View style={themedStyles.settingsRowTextContainer}>
                <Text style={themedStyles.settingsRowText}>
                  Highlight Picker Side
                </Text>
                <Text style={themedStyles.settingsRowSubtext}>
                  Which side the color picker slides out from when highlighting.
                </Text>
              </View>
              <Text style={themedStyles.settingsRowText}>
                {highlightPickerSide === "left" ? "Left" : "Right"}
              </Text>
            </Pressable>
          </View>
          <DateTimePickerModal
            isVisible={isDarkModeStartPickerVisible}
            mode="time"
            date={minutesOfDayToDate(darkModeScheduleStartMinutes)}
            onConfirm={handleSetDarkModeScheduleStart}
            onCancel={() => setIsDarkModeStartPickerVisible(false)}
          />
          <DateTimePickerModal
            isVisible={isDarkModeEndPickerVisible}
            mode="time"
            date={minutesOfDayToDate(darkModeScheduleEndMinutes)}
            onConfirm={handleSetDarkModeScheduleEnd}
            onCancel={() => setIsDarkModeEndPickerVisible(false)}
          />

          {Platform.OS === "ios" && (
            <>
              <Text style={themedStyles.settingsSectionHeader}>Church</Text>
              <View style={themedStyles.settingsGroup}>
                <View
                  style={[
                    themedStyles.settingsRow,
                    themedStyles.settingsRowGrouped,
                    themedStyles.settingsRowGroupedLast,
                  ]}
                >
                  <View style={themedStyles.settingsRowTextContainer}>
                    <Text style={themedStyles.settingsRowText}>
                      Open Church Center App
                    </Text>
                    <Text style={themedStyles.settingsRowSubtext}>
                      Automatically open the Church Center app when tapping the
                      Church tab (if installed)
                    </Text>
                  </View>
                  <Switch
                    onValueChange={handleToggleChurchCenterDeepLink}
                    value={enableChurchCenterDeepLink}
                  />
                </View>
              </View>
            </>
          )}

          <Text style={themedStyles.settingsSectionHeader}>Google Docs</Text>
          <View style={themedStyles.accountPanel}>
            {isSignedIn ? (
              <>
                <Text style={themedStyles.settingsRowText}>
                  Sync Notes to Google Docs
                </Text>
                <Text style={themedStyles.accountPanelMutedText}>
                  {notesExportStatusLabel}
                </Text>
                {notesExportGoogleAccountEmail && (
                  <Text style={themedStyles.accountPanelMutedText}>
                    Connected as {notesExportGoogleAccountEmail}
                  </Text>
                )}
                {notesExportDocumentTitle && (
                  <Text style={themedStyles.accountPanelMutedText}>
                    Document: {notesExportDocumentTitle}
                  </Text>
                )}
                <Text style={themedStyles.accountPanelMutedText}>
                  Last synced: {notesExportLastSyncedLabel}
                </Text>
                {notesExportLastError && (
                  <Text style={themedStyles.accountErrorText}>
                    {notesExportLastError}
                  </Text>
                )}

                {notesExportStatus === "disconnected" ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy || isNotesExportBusy}
                    onPress={handleConnectNotesExport}
                    style={({ pressed }) => [
                      themedStyles.accountButton,
                      themedStyles.accountButtonPrimary,
                      { marginTop: 12 },
                      getPressFeedbackStyle(
                        pressed || isBusy || isNotesExportBusy,
                        uiPreferences.isEinkMode,
                        {
                          pressedOpacity: 0.7,
                          isDarkMode: theme.dark,
                        }
                      ),
                    ]}
                  >
                    <Text
                      style={[
                        themedStyles.accountButtonText,
                        themedStyles.accountButtonPrimaryText,
                      ]}
                    >
                      Connect Google Docs
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <View style={themedStyles.accountButtonRow}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isBusy || isNotesExportBusy}
                        onPress={
                          isNotesExportConnected
                            ? handleSyncNotesExportNow
                            : handleReconnectNotesExport
                        }
                        style={({ pressed }) => [
                          themedStyles.accountButton,
                          themedStyles.accountButtonPrimary,
                          getPressFeedbackStyle(
                            pressed || isBusy || isNotesExportBusy,
                            uiPreferences.isEinkMode,
                            {
                              pressedOpacity: 0.7,
                              isDarkMode: theme.dark,
                            }
                          ),
                        ]}
                      >
                        <Text
                          style={[
                            themedStyles.accountButtonText,
                            themedStyles.accountButtonPrimaryText,
                          ]}
                        >
                          {isNotesExportConnected ? "Sync Now" : "Reconnect"}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isBusy || isNotesExportBusy}
                        onPress={handleDisconnectNotesExport}
                        style={({ pressed }) => [
                          themedStyles.accountButton,
                          getPressFeedbackStyle(
                            pressed || isBusy || isNotesExportBusy,
                            uiPreferences.isEinkMode,
                            {
                              pressedOpacity: 0.7,
                              isDarkMode: theme.dark,
                            }
                          ),
                        ]}
                      >
                        <Text style={themedStyles.accountButtonText}>
                          Disconnect
                        </Text>
                      </Pressable>
                    </View>

                    {!isNotesExportConnected && (
                      <Pressable
                        accessibilityRole="button"
                        disabled={isBusy || isNotesExportBusy}
                        onPress={handleCreateNewNotesExportDocument}
                        style={({ pressed }) => [
                          themedStyles.accountButton,
                          getPressFeedbackStyle(
                            pressed || isBusy || isNotesExportBusy,
                            uiPreferences.isEinkMode,
                            {
                              pressedOpacity: 0.7,
                              isDarkMode: theme.dark,
                            }
                          ),
                        ]}
                      >
                        <Text style={themedStyles.accountButtonText}>
                          Create New Google Doc
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}
              </>
            ) : (
              <Text style={themedStyles.accountPanelMutedText}>
                Sign in to your Sovereign Hope account before enabling Google
                Docs export.
              </Text>
            )}
          </View>

          <Text style={themedStyles.settingsSectionHeader}>Account</Text>
          <View style={themedStyles.accountPanel}>
            {!authIsInitialized && (
              <ActivityIndicator style={{ marginBottom: 12 }} />
            )}

            {authErrorMessage && (
              <Text style={themedStyles.accountErrorText}>
                {authErrorMessage}
              </Text>
            )}

            {isSignedIn ? (
              <>
                <Text style={themedStyles.settingsRowText}>
                  {authUser?.displayName || authUser?.email || "Signed In"}
                </Text>
                <Text style={themedStyles.accountPanelMutedText}>
                  {authUser?.email ??
                    "Your account is connected for cloud sync."}
                </Text>
                <Text style={themedStyles.accountPanelMutedText}>
                  {authIsSyncing ? "Syncing…" : "Cloud sync enabled"}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={handleSignOut}
                  style={({ pressed }) => [
                    themedStyles.accountButton,
                    { marginVertical: 12 },
                    getPressFeedbackStyle(
                      pressed || isBusy,
                      uiPreferences.isEinkMode,
                      {
                        pressedOpacity: 0.7,
                        isDarkMode: theme.dark,
                      }
                    ),
                  ]}
                >
                  <Text style={themedStyles.accountButtonText}>Sign Out</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={handleDeleteAccount}
                  style={({ pressed }) => [
                    themedStyles.accountTextAction,
                    getPressFeedbackStyle(
                      pressed || isBusy,
                      uiPreferences.isEinkMode,
                      {
                        pressedOpacity: 0.7,
                        isDarkMode: theme.dark,
                      }
                    ),
                  ]}
                >
                  <Text style={themedStyles.accountTextActionDanger}>
                    Delete Account
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={themedStyles.accountPanelMutedText}>
                  Sign in to back up your progress and settings across devices.
                  The app still works without an account.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={showAccountSignIn}
                  style={({ pressed }) => [
                    themedStyles.accountButton,
                    themedStyles.accountButtonPrimary,
                    { marginTop: 12 },
                    getPressFeedbackStyle(
                      pressed || isBusy,
                      uiPreferences.isEinkMode,
                      {
                        pressedOpacity: 0.7,
                        isDarkMode: theme.dark,
                      }
                    ),
                  ]}
                >
                  <Text
                    style={[
                      themedStyles.accountButtonText,
                      themedStyles.accountButtonPrimaryText,
                    ]}
                  >
                    Sign In / Create Account
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* <View style={themedStyles.settingsRow}>
          <Text style={themedStyles.settingsRowText}>
            Show Children&apos;s Plan
          </Text>
          <Switch
            onValueChange={handleToggleShowChildrensPlan}
            value={showChildrensPlan}
          />
        </View> */}
        </ScrollView>

        <Modal
          animationType={uiPreferences.disableAnimations ? "none" : "fade"}
          transparent
          visible={isDeletePasswordPromptVisible}
          onRequestClose={() => {
            setIsDeletePasswordPromptVisible(false);
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close dialog"
            accessibilityHint="Dismisses the delete account password prompt"
            style={themedStyles.modalBackdrop}
            onPress={() => {
              setIsDeletePasswordPromptVisible(false);
            }}
          >
            <Pressable
              accessibilityRole="none"
              style={themedStyles.modalCard}
              onPress={(event) => {
                event.stopPropagation();
              }}
            >
              <Text style={themedStyles.modalTitle}>Delete Account</Text>
              <Text style={themedStyles.modalBody}>
                Enter your password to continue. Your synced data will be
                permanently deleted.
              </Text>
              <SecureInput
                placeholderMessage="Password"
                value={deletePassword}
                onChangeText={(value) => {
                  setDeletePassword(value);
                  if (authErrorMessage) {
                    dispatch(clearAuthError());
                  }
                }}
              />
              <View style={themedStyles.modalButtonRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setIsDeletePasswordPromptVisible(false);
                  }}
                  style={({ pressed }) => [
                    themedStyles.accountButton,
                    getPressFeedbackStyle(
                      pressed || isBusy,
                      uiPreferences.isEinkMode,
                      {
                        pressedOpacity: 0.7,
                        isDarkMode: theme.dark,
                      }
                    ),
                  ]}
                >
                  <Text style={themedStyles.accountButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => {
                    if (!deletePassword) {
                      Alert.alert("Missing Password", "Enter your password.");
                      return;
                    }
                    setIsDeletePasswordPromptVisible(false);
                    void dispatch(
                      deleteAccount({
                        reauth: { password: deletePassword },
                        clearLocalData: true,
                      })
                    );
                  }}
                  style={({ pressed }) => [
                    themedStyles.accountButton,
                    themedStyles.accountButtonDanger,
                    getPressFeedbackStyle(
                      pressed || isBusy,
                      uiPreferences.isEinkMode,
                      {
                        pressedOpacity: 0.7,
                        isDarkMode: theme.dark,
                      }
                    ),
                  ]}
                >
                  <Text
                    style={[
                      themedStyles.accountButtonText,
                      themedStyles.accountButtonDangerText,
                    ]}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
