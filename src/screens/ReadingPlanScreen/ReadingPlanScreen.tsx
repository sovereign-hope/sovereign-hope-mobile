import React, { useCallback, useEffect, useState } from "react";
import { useNetInfo } from "@react-native-community/netinfo";
import {
  Alert,
  Image,
  ListViewDataSource,
  ListViewProps,
  Platform,
  SectionList,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { IMAGES } from "src/style/images";
import { FlatButton } from "src/components/FlatButton/FlatButton";
import { useAppSelector } from "src/hooks/store";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "src/navigation/RootNavigator";
import { useTheme } from "@react-navigation/native";
import {
  selectReadingPlan,
  getReadingPlan,
  ReadingPlanWeek,
  ReadingPlanDay,
} from "src/redux/readingPlanSlice";
import { styles } from "./ReadingPlanScreen.styles";

type Props = NativeStackScreenProps<RootStackParamList, "ReadingPlan">;

export const ReadingPlanScreen: React.FunctionComponent<Props> = ({
  navigation,
}: Props) => {
  // Custom hooks
  const dispatch = useDispatch();
  const readingPlan = useAppSelector(selectReadingPlan);
  const theme = useTheme();

  // State hooks
  const [listData, setListData] = useState<Array<{ title: string; data: any }>>(
    []
  );

  // Callback hooks

  // Effect hooks
  React.useEffect(() => {
    dispatch(getReadingPlan());
  }, [dispatch]);

  useEffect(() => {
    if (readingPlan) {
      const data = readingPlan.weeks.map(
        (week: ReadingPlanWeek, index: number) => ({
          title: `Week ${index + 1}`,
          data: week.days,
        })
      );
      setListData(data);
    }
  }, [readingPlan]);

  // Event handlers

  // Constants
  const themedStyles = styles({ theme });

  return (
    <SafeAreaView style={themedStyles.screen}>
      <SectionList
        sections={listData}
        keyExtractor={(item: Array<ReadingPlanDay>, index) =>
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `${item[0]?.studies ?? 0}${index}`
        }
        renderItem={({ item }) => {
          return <Text style={themedStyles.headerText}>{item.toString()}</Text>;
        }}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={themedStyles.headerText}>{title}</Text>
        )}
      />
    </SafeAreaView>
  );
};
