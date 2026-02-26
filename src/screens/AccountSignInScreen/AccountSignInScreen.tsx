import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { EmailInput, SecureInput } from "src/components";
import { elementSize, radius, spacing } from "src/style/layout";
import { colors } from "src/style/colors";
import {
  clearAuthError,
  createEmailPasswordAccountThunk,
  selectAuthErrorMessage,
  selectAuthIsLoading,
  selectAuthIsSyncing,
  selectAuthUser,
  sendPasswordResetThunk,
  signInWithAppleThunk,
  signInWithGoogleThunk,
  signInWithEmailPasswordThunk,
} from "src/redux/authSlice";

type Props = NativeStackScreenProps<RootStackParamList, "Account Sign In">;
type AuthMode = "signIn" | "create";
type PendingAction = AuthMode | "apple" | "google";

export const AccountSignInScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const authUser = useAppSelector(selectAuthUser);
  const authErrorMessage = useAppSelector(selectAuthErrorMessage);
  const authIsLoading = useAppSelector(selectAuthIsLoading);
  const authIsSyncing = useAppSelector(selectAuthIsSyncing);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("signIn");
  const [pendingPrimaryAction, setPendingPrimaryAction] =
    // eslint-disable-next-line unicorn/no-useless-undefined
    useState<PendingAction | undefined>(undefined);

  const isBusy = authIsLoading || authIsSyncing;

  useEffect(() => {
    if (!authErrorMessage) {
      return;
    }

    Alert.alert("Authentication Error", authErrorMessage, [
      {
        text: "OK",
        onPress: () => {
          dispatch(clearAuthError());
        },
      },
    ]);
  }, [authErrorMessage, dispatch]);

  const handleAppleSignIn = async () => {
    Keyboard.dismiss();
    setPendingPrimaryAction("apple");
    const resultAction = await dispatch(signInWithAppleThunk());
    // eslint-disable-next-line unicorn/prefer-regexp-test
    if (signInWithAppleThunk.fulfilled.match(resultAction)) {
      navigation.goBack();
      return;
    }
    setPendingPrimaryAction(undefined);
  };

  const handleGoogleSignIn = async () => {
    Keyboard.dismiss();
    setPendingPrimaryAction("google");

    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        setPendingPrimaryAction(undefined);
        return;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        Alert.alert(
          "Google Sign In Failed",
          "Google did not return an ID token. Check OAuth client configuration and try again."
        );
        setPendingPrimaryAction(undefined);
        return;
      }

      const resultAction = await dispatch(signInWithGoogleThunk({ idToken }));
      // eslint-disable-next-line unicorn/prefer-regexp-test
      if (signInWithGoogleThunk.fulfilled.match(resultAction)) {
        navigation.goBack();
        return;
      }
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (
        err.code === statusCodes.SIGN_IN_CANCELLED ||
        err.code === statusCodes.IN_PROGRESS
      ) {
        setPendingPrimaryAction(undefined);
        return;
      }
      Alert.alert("Google Sign In Failed", (error as Error).message);
    }
    setPendingPrimaryAction(undefined);
  };

  const handleEmailSignIn = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      Alert.alert("Missing Info", "Enter your email and password.");
      return;
    }
    setPendingPrimaryAction("signIn");
    const resultAction = await dispatch(
      signInWithEmailPasswordThunk({ email: email.trim(), password })
    );
    // eslint-disable-next-line unicorn/prefer-regexp-test
    if (signInWithEmailPasswordThunk.fulfilled.match(resultAction)) {
      navigation.goBack();
      return;
    }
    setPendingPrimaryAction(undefined);
  };

  const handleCreateAccount = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      Alert.alert("Missing Info", "Enter your email and password.");
      return;
    }
    setPendingPrimaryAction("create");
    const resultAction = await dispatch(
      createEmailPasswordAccountThunk({ email: email.trim(), password })
    );
    // eslint-disable-next-line unicorn/prefer-regexp-test
    if (createEmailPasswordAccountThunk.fulfilled.match(resultAction)) {
      navigation.goBack();
      return;
    }
    setPendingPrimaryAction(undefined);
  };

  const handlePasswordReset = () => {
    Keyboard.dismiss();
    if (!email) {
      Alert.alert("Missing Email", "Enter your email to reset your password.");
      return;
    }
    void dispatch(sendPasswordResetThunk({ email: email.trim() }));
    Alert.alert(
      "Reset Email Sent",
      "If an account exists, a reset email was sent."
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const screenStyles = styles({ dark: theme.dark, colors: theme.colors });
  const isCreateMode = authMode === "create";
  const shouldShowPrimaryButtonSpinner =
    isBusy && pendingPrimaryAction === authMode;
  const shouldShowAppleSpinner = isBusy && pendingPrimaryAction === "apple";
  const shouldShowGoogleSpinner = isBusy && pendingPrimaryAction === "google";

  return (
    <SafeAreaView edges={["left", "right"]} style={screenStyles.screen}>
      <KeyboardAvoidingView
        style={screenStyles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={screenStyles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          <Text style={screenStyles.title}>
            {isCreateMode
              ? "Create an account for sync"
              : "Sign in to sync across devices"}
          </Text>
          <Text style={screenStyles.subtitle}>
            Apple Sign In is available on iPhone. Email and password works on
            both platforms.
          </Text>

          {authUser ? (
            <View style={screenStyles.card}>
              <Text style={screenStyles.bodyText}>
                You’re already signed in as{" "}
                {authUser.email ?? authUser.displayName ?? "this account"}.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [
                  screenStyles.button,
                  screenStyles.primaryButton,
                  pressed && screenStyles.pressed,
                ]}
              >
                <Text
                  style={[
                    screenStyles.buttonText,
                    screenStyles.primaryButtonText,
                  ]}
                >
                  Back to Settings
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={screenStyles.card}>
              <View style={screenStyles.segmentedControl}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => {
                    Keyboard.dismiss();
                    setAuthMode("signIn");
                  }}
                  style={({ pressed }) => [
                    screenStyles.segmentButton,
                    authMode === "signIn" && screenStyles.segmentButtonActive,
                    (pressed || isBusy) && screenStyles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      screenStyles.segmentButtonText,
                      authMode === "signIn" &&
                        screenStyles.segmentButtonTextActive,
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => {
                    Keyboard.dismiss();
                    setAuthMode("create");
                  }}
                  style={({ pressed }) => [
                    screenStyles.segmentButton,
                    authMode === "create" && screenStyles.segmentButtonActive,
                    (pressed || isBusy) && screenStyles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      screenStyles.segmentButtonText,
                      authMode === "create" &&
                        screenStyles.segmentButtonTextActive,
                    ]}
                  >
                    Create Account
                  </Text>
                </Pressable>
              </View>

              {Platform.OS === "ios" && (
                <>
                  {shouldShowAppleSpinner ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled
                      style={[
                        screenStyles.button,
                        screenStyles.socialButton,
                        screenStyles.socialButtonApple,
                      ]}
                    >
                      <ActivityIndicator
                        color={theme.dark ? colors.black : colors.white}
                      />
                    </Pressable>
                  ) : (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={
                        AppleAuthentication.AppleAuthenticationButtonType
                          .SIGN_IN
                      }
                      buttonStyle={
                        theme.dark
                          ? AppleAuthentication.AppleAuthenticationButtonStyle
                              .WHITE
                          : AppleAuthentication.AppleAuthenticationButtonStyle
                              .BLACK
                      }
                      cornerRadius={8}
                      style={{
                        width: "100%",
                        height: 52,
                        marginBottom: spacing.lmedium,
                      }}
                      onPress={() => {
                        void handleAppleSignIn();
                      }}
                    />
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                    accessibilityHint="Signs in with your Google account"
                    disabled={isBusy}
                    onPress={() => {
                      void handleGoogleSignIn();
                    }}
                    style={({ pressed }) => [
                      screenStyles.googleButton,
                      (pressed || isBusy) && screenStyles.pressed,
                    ]}
                  >
                    {shouldShowGoogleSpinner ? (
                      <ActivityIndicator color={theme.colors.text} />
                    ) : (
                      <>
                        <Image
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, unicorn/prefer-module
                          source={require("../../../assets/google-g-logo.png")}
                          accessibilityIgnoresInvertColors
                          style={screenStyles.googleLogo}
                        />
                        <Text style={screenStyles.googleButtonText}>
                          Continue with Google
                        </Text>
                      </>
                    )}
                  </Pressable>
                  <View style={screenStyles.divider} />
                </>
              )}

              {Platform.OS !== "ios" && (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                    accessibilityHint="Signs in with your Google account"
                    disabled={isBusy}
                    onPress={() => {
                      void handleGoogleSignIn();
                    }}
                    style={({ pressed }) => [
                      screenStyles.googleButton,
                      (pressed || isBusy) && screenStyles.pressed,
                    ]}
                  >
                    {shouldShowGoogleSpinner ? (
                      <ActivityIndicator color={theme.colors.text} />
                    ) : (
                      <>
                        <Image
                          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, unicorn/prefer-module
                          source={require("../../../assets/google-g-logo.png")}
                          accessibilityIgnoresInvertColors
                          style={screenStyles.googleLogo}
                        />
                        <Text style={screenStyles.googleButtonText}>
                          Continue with Google
                        </Text>
                      </>
                    )}
                  </Pressable>
                  <View style={screenStyles.divider} />
                </>
              )}

              <EmailInput
                placeholderMessage="Email"
                value={email}
                style={screenStyles.authInput}
                onChangeText={(value) => {
                  setEmail(value);
                  if (authErrorMessage) {
                    dispatch(clearAuthError());
                  }
                }}
              />
              <SecureInput
                placeholderMessage="Password"
                value={password}
                style={screenStyles.authInput}
                onChangeText={(value) => {
                  setPassword(value);
                  if (authErrorMessage) {
                    dispatch(clearAuthError());
                  }
                }}
              />

              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => {
                  if (isCreateMode) {
                    void handleCreateAccount();
                    return;
                  }
                  void handleEmailSignIn();
                }}
                style={({ pressed }) => [
                  screenStyles.button,
                  screenStyles.primaryButton,
                  (pressed || isBusy) && screenStyles.pressed,
                ]}
              >
                {shouldShowPrimaryButtonSpinner ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text
                    style={[
                      screenStyles.buttonText,
                      screenStyles.primaryButtonText,
                    ]}
                  >
                    {isCreateMode ? "Create Account" : "Sign In"}
                  </Text>
                )}
              </Pressable>

              {!isCreateMode && (
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={handlePasswordReset}
                  style={({ pressed }) => [
                    screenStyles.secondaryLinkButton,
                    (pressed || isBusy) && screenStyles.pressed,
                  ]}
                >
                  <Text style={screenStyles.secondaryLinkText}>
                    Reset Password
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = ({
  dark,
  colors: themeColors,
}: {
  dark: boolean;
  colors: {
    background: string;
    card: string;
    text: string;
    border: string;
  };
}) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    flex: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      padding: spacing.large,
      paddingBottom: spacing.extraLarge,
    },
    title: {
      color: themeColors.text,
      fontSize: 20,
      fontWeight: "700",
      marginBottom: spacing.medium,
    },
    subtitle: {
      color: themeColors.text,
      opacity: 0.75,
      marginBottom: spacing.large,
    },
    card: {
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: spacing.large,
    },
    bodyText: {
      color: themeColors.text,
      marginBottom: spacing.large,
    },
    loading: {
      marginBottom: spacing.medium,
    },
    divider: {
      height: 1,
      backgroundColor: themeColors.border,
      marginTop: spacing.small,
      marginBottom: spacing.large,
    },
    socialButton: {
      width: "100%",
      marginBottom: spacing.lmedium,
    },
    googleButton: {
      width: "100%",
      height: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.white,
      borderRadius: radius.medium,
      borderWidth: 1,
      borderColor: "#747775",
      marginBottom: spacing.lmedium,
    },
    googleLogo: {
      width: 20,
      height: 20,
      marginRight: spacing.medium,
    },
    googleButtonText: {
      color: "#1f1f1f",
      fontSize: 16,
      fontWeight: "500",
    },
    socialButtonApple: {
      backgroundColor: dark ? colors.white : colors.black,
      borderColor: dark ? colors.white : colors.black,
    },
    authInput: {
      minHeight: 52,
      fontSize: 16,
      paddingVertical: spacing.lmedium,
    },
    segmentedControl: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: radius.medium,
      overflow: "hidden",
      marginBottom: spacing.large,
      backgroundColor: themeColors.background,
    },
    segmentButton: {
      flex: 1,
      minHeight: elementSize.small,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.medium,
    },
    segmentButtonActive: {
      backgroundColor: themeColors.card,
    },
    segmentButtonText: {
      color: themeColors.text,
      opacity: 0.8,
      fontWeight: "600",
      textAlign: "center",
      fontSize: 13,
    },
    segmentButtonTextActive: {
      opacity: 1,
    },
    button: {
      flex: 1,
      minHeight: elementSize.small,
      borderWidth: 1,
      borderColor: themeColors.border,
      backgroundColor: themeColors.background,
      borderRadius: radius.medium,
      paddingVertical: spacing.medium,
      paddingHorizontal: spacing.large,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    buttonText: {
      color: themeColors.text,
      fontWeight: "600",
    },
    primaryButtonText: {
      color: colors.white,
    },
    pressed: {
      opacity: 0.7,
    },
    secondaryLinkButton: {
      alignSelf: "center",
      marginTop: spacing.large,
      paddingVertical: spacing.small,
      paddingHorizontal: spacing.medium,
    },
    secondaryLinkText: {
      color: themeColors.text,
      opacity: 0.7,
      textDecorationLine: "underline",
    },
  });
