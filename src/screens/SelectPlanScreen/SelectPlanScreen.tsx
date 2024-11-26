/* eslint-disable react/prop-types */
// Disabling this because of weird behavior with the react/prop-types rule in this file. It isn't recognizing navigation
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  ImageSourcePropType,
  Pressable,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { usePreventRemoveContext, useTheme } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import {
  selectAvailablePlans,
  selectReadingPlan,
  getReadingPlanProgressState,
  getAvailablePlans,
} from "src/redux/readingPlanSlice";
import { colors } from "src/style/colors";
import { spacing } from "src/style/layout";
import { styles } from "./SelectPlanScreen.styles";
import { ScrollView } from "react-native-gesture-handler";
import {
  selectSubscribedPlans,
  storeSubscribedPlans,
} from "src/redux/settingsSlice";

import twoYearBibleBanner from "../../../assets/two-year-bible-banner.png";
import bibleEssentialsBanner from "../../../assets/bible-essentials-banner.png";

export type SelectPlanScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "Available Plans"
>;

export const SelectPlanScreen: React.FunctionComponent<SelectPlanScreenProps> =
  ({ route, navigation }: SelectPlanScreenProps) => {
    // Custom hooks
    const dispatch = useDispatch();
    const availablePlans = useAppSelector(selectAvailablePlans);
    const subscribedPlans = useAppSelector(selectSubscribedPlans);
    const theme = useTheme();

    // State
    const [planHasChanged, setPlanHasChanged] = useState(false);

    // Effect hooks
    React.useEffect(() => {
      dispatch(getAvailablePlans());
      if (subscribedPlans.length === 0) {
        navigation.setOptions({ headerBackVisible: false });
      }
    }, [dispatch]);

    useEffect(() => {
      if (subscribedPlans.length > 0 && planHasChanged) {
        navigation.goBack();
      }
    }, [subscribedPlans, planHasChanged]);

    // Constants
    const themedStyles = styles({ theme });
    const bannerMap = {
      "Two Year Bible": twoYearBibleBanner as ImageSourcePropType,
      "Bible Essentials": bibleEssentialsBanner as ImageSourcePropType,
    };

    const handlePlanTap = (planKey: string) => {
      setPlanHasChanged(true);
      dispatch(storeSubscribedPlans([planKey]));
    };

    return (
      <SafeAreaView edges={["left", "right"]} style={themedStyles.screen}>
        <ScrollView
          style={themedStyles.screen}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* <Text style={themedStyles.title}>
            {new Date().getFullYear()} Plans
          </Text> */}
          <Text style={themedStyles.subtitle}>
            Choose the plan that best fits your season of life and read along
            with others in the church.
          </Text>
          {availablePlans.map((plan) => (
            <Pressable
              key={plan.id}
              onPress={() => handlePlanTap(plan.id)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                ...themedStyles.cardContainerView,
                backgroundColor: pressed
                  ? theme.colors.background
                  : theme.colors.card,
              })}
            >
              <View style={themedStyles.cardView}>
                <Image
                  source={bannerMap[plan.title as keyof typeof bannerMap]}
                  style={themedStyles.banner}
                  accessibilityIgnoresInvertColors
                />
              </View>
              <Text style={themedStyles.cardTitle}>{plan.title}</Text>
              <Text style={themedStyles.cardSubtitle}>{plan.description}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  };

/* eslint-enable react/prop-types */
