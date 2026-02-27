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
  selectShowChildrensPlan,
  storeShowChildrensPlan,
  getShowChildrensPlan,
  selectEnableChurchCenterDeepLink,
  storeEnableChurchCenterDeepLink,
  getEnableChurchCenterDeepLink,
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

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

// Create a Date object from a notification time string
const getDateFromTimeString = (timeString: string): Date => {
  const today = new Date();
  try {
    if (!timeString) return today;

    const timeParts = timeString.split(":");
    if (timeParts.length !== 2) return today;

    let hour = Number.parseInt(timeParts[0]);
    const minuteParts = timeParts[1].split(" ");
    if (minuteParts.length !== 2) return today;

    const minute = Number.parseInt(minuteParts[0]);
    const ampm = minuteParts[1];

    if (Number.isNaN(hour) || Number.isNaN(minute)) return today;

    if (ampm === "PM" && hour !== 12) {
      hour += 12;
    }
    if (ampm === "AM" && hour === 12) {
      hour = 0;
    }

    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date;
  } catch (error) {
    console.error("Error parsing time string:", error);
    return today;
  }
};

export const SettingsScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const enableNotifications = useAppSelector(selectEnableNotifications);
  const notificationTime = useAppSelector(selectNotificationTime);
  const readingPlan = useAppSelector(selectReadingPlan);
  const availablePlans = useAppSelector(selectAvailablePlans);
  const showChildrensPlan = useAppSelector(selectShowChildrensPlan);
  const enableChurchCenterDeepLink = useAppSelector(
    selectEnableChurchCenterDeepLink
  );
  const authUser = useAppSelector(selectAuthUser);
  const authIsInitialized = useAppSelector(selectAuthIsInitialized);
  const authIsLoading = useAppSelector(selectAuthIsLoading);
  const authIsSyncing = useAppSelector(selectAuthIsSyncing);
  const authErrorMessage = useAppSelector(selectAuthErrorMessage);

  // Ref Hooks

  // State hooks
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
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
  }, [dispatch]);

  // Event handlers
  const handleToggleNotifications = (value: boolean) => {
    void dispatch(storeEnableNotificationsState(value));
  };

  const handleToggleShowChildrensPlan = (value: boolean) => {
    void dispatch(storeShowChildrensPlan(value));
  };

  const handleToggleChurchCenterDeepLink = (value: boolean) => {
    void dispatch(storeEnableChurchCenterDeepLink(value));
  };

  const handleSetNotificationTime = (value: Date) => {
    void dispatch(storeNotificationTime(value));
    setIsDatePickerVisible(false);
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

  // Constants
  const themedStyles = styles({ theme });
  const isSignedIn = Boolean(authUser);
  const isBusy = authIsLoading || authIsSyncing;
  const isIOS = Platform.OS === "ios";

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={themedStyles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={16}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          <Text style={themedStyles.settingsSectionHeader}>Notifications</Text>
          <View style={isIOS ? themedStyles.settingsGroup : undefined}>
            <View
              style={[
                themedStyles.settingsRow,
                isIOS && themedStyles.settingsRowGrouped,
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
                isIOS && themedStyles.settingsRowGrouped,
                isIOS && themedStyles.settingsRowGroupedLast,
                pressed && themedStyles.settingsRowPressed,
              ]}
            >
              <Text style={themedStyles.settingsRowText}>Notification Time</Text>
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
          <View style={isIOS ? themedStyles.settingsGroup : undefined}>
            {availablePlans.length > 1 && (
              <Pressable
                onPress={showSelectReadingPlan}
                accessibilityRole="button"
                style={({ pressed }) => [
                  themedStyles.settingsRow,
                  isIOS && themedStyles.settingsRowGrouped,
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
                isIOS && themedStyles.settingsRowGrouped,
                isIOS && themedStyles.settingsRowGroupedLast,
                pressed && themedStyles.settingsRowPressed,
              ]}
            >
              <Text style={themedStyles.settingsRowText}>Reading Font Size</Text>
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
                    (pressed || isBusy) && { opacity: 0.7 },
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
                    (pressed || isBusy) && { opacity: 0.7 },
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
                    (pressed || isBusy) && { opacity: 0.7 },
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
          animationType="fade"
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
                    (pressed || isBusy) && { opacity: 0.7 },
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
                    (pressed || isBusy) && { opacity: 0.7 },
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
