import React, { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "src/hooks/store";
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
  storeReadingFontSize,
} from "src/redux/settingsSlice";
import { styles } from "./FontSizePickerScreen.styles";
import { ScrollView } from "react-native-gesture-handler";

type Props = NativeStackScreenProps<RootStackParamList, "Font Size">;

export const FontSizePickerScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  const dispatch = useDispatch();
  const theme = useTheme();

  // Ref Hooks

  // State hooks

  // Callback hooks

  // Effect hooks
  useEffect(() => {}, [dispatch]);

  // Event handlers
  const handleSetFontSize = (value: number) => {
    dispatch(storeReadingFontSize(value));
    navigation.goBack();
  };

  // Constants
  const themedStyles = styles({ theme });
  const fontSizes = [13, 16, 20, 24, 30, 36];

  return (
    <SafeAreaView edges={["left", "right"]} style={themedStyles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {/* <Text style={themedStyles.settingsSectionHeader}>Reading Plan</Text> */}

        {fontSizes.map((pointValue) => (
          <Pressable
            key={pointValue}
            onPress={() => handleSetFontSize(pointValue)}
            accessibilityRole="button"
            style={({ pressed }) => [
              themedStyles.settingsRow,
              {
                backgroundColor: pressed
                  ? theme.colors.background
                  : theme.colors.card,
              },
            ]}
          >
            <Text
              style={{ ...themedStyles.settingsRowText, fontSize: pointValue }}
            >
              In the beginning, God
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};
