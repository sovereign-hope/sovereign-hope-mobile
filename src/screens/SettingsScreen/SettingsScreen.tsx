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
  selectShowChildrensPlan,
  storeShowChildrensPlan,
  getShowChildrensPlan,
} from "src/redux/settingsSlice";
import { styles } from "./SettingsScreen.styles";
import { ScrollView } from "react-native-gesture-handler";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
  selectAvailablePlans,
  selectReadingPlan,
} from "src/redux/readingPlanSlice";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export const SettingsScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  const dispatch = useDispatch();
  const theme = useTheme();
  const enableNotifications = useAppSelector(selectEnableNotifications);
  const notificationTime = useAppSelector(selectNotificationTime);
  const readingPlan = useAppSelector(selectReadingPlan);
  const availablePlans = useAppSelector(selectAvailablePlans);
  const showChildrensPlan = useAppSelector(selectShowChildrensPlan);

  // Ref Hooks

  // State hooks
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // Create a Date object from the current notification time string
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

  // Callback hooks

  // Effect hooks
  useEffect(() => {
    dispatch(getEnableNotificationsState());
    dispatch(getNotificationTime());
    dispatch(getShowChildrensPlan());
  }, [dispatch]);

  // Event handlers
  const handleToggleNotifications = (value: boolean) => {
    dispatch(storeEnableNotificationsState(value));
  };

  const handleToggleShowChildrensPlan = (value: boolean) => {
    dispatch(storeShowChildrensPlan(value));
  };

  const handleSetNotificationTime = (value: Date) => {
    dispatch(storeNotificationTime(value));
    setIsDatePickerVisible(false);
  };

  const showSelectReadingPlan = () => {
    navigation.push("Available Plans");
  };

  const showSelectFontSize = () => {
    navigation.push("Font Size");
  };

  // Constants
  const themedStyles = styles({ theme });

  return (
    <SafeAreaView edges={["left", "right"]} style={themedStyles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Text style={themedStyles.settingsSectionHeader}>Notifications</Text>
        <View style={themedStyles.settingsRow}>
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
            {
              backgroundColor: pressed
                ? theme.colors.background
                : theme.colors.card,
            },
          ]}
        >
          <Text style={themedStyles.settingsRowText}>Notification Time</Text>
          <View style={themedStyles.settingsRowValueContainer}>
            <Text style={themedStyles.settingsRowText}>{notificationTime}</Text>
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

        <Text style={themedStyles.settingsSectionHeader}>Reading</Text>

        {availablePlans.length > 1 && (
          <Pressable
            onPress={showSelectReadingPlan}
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
            {
              backgroundColor: pressed
                ? theme.colors.background
                : theme.colors.card,
            },
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
    </SafeAreaView>
  );
};
