/* eslint-disable unicorn/no-null */
import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { MemberAvatar } from "src/components";
import type { MemberAvatarHandle } from "src/components";
import { selectIsMember } from "src/redux/authSlice";
import {
  fetchDailyPrayerAssignment,
  selectHasPrayerError,
  selectIsFallbackPrayerAssignment,
  selectIsLoadingPrayer,
  selectPrayerAssignment,
  selectPrayerAssignmentDate,
} from "src/redux/memberSlice";
import { styles } from "./DailyPrayerScreen.styles";

const DailyPrayerRow = ({
  member,
  themedStyles,
}: {
  member: { uid: string; displayName: string; photoURL: string | null };
  themedStyles: ReturnType<typeof styles>;
}) => {
  const avatarRef = useRef<MemberAvatarHandle>(null);
  return (
    <Pressable
      style={themedStyles.card}
      onPress={() => avatarRef.current?.showPhoto()}
      accessibilityRole="button"
      accessibilityLabel={`View photo of ${member.displayName}`}
      accessibilityHint="Opens an enlarged view of the member's photo"
    >
      <MemberAvatar
        ref={avatarRef}
        size={52}
        photoURL={member.photoURL}
        displayName={member.displayName}
      />
      <View style={themedStyles.cardTextContainer}>
        <Text style={themedStyles.cardName}>{member.displayName}</Text>
      </View>
    </Pressable>
  );
};

export const DailyPrayerScreen: React.FunctionComponent = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const themedStyles = styles({ theme });
  const isMember = useAppSelector(selectIsMember);
  const assignment = useAppSelector(selectPrayerAssignment);
  const assignmentDate = useAppSelector(selectPrayerAssignmentDate);
  const isFallback = useAppSelector(selectIsFallbackPrayerAssignment);
  const isLoadingPrayer = useAppSelector(selectIsLoadingPrayer);
  const hasPrayerError = useAppSelector(selectHasPrayerError);
  const handleGenerateTodayAssignment = () => {
    void dispatch(fetchDailyPrayerAssignment({ generateIfMissing: true }));
  };

  useEffect(() => {
    if (!isMember) {
      return;
    }
    void dispatch(fetchDailyPrayerAssignment());
  }, [dispatch, isMember]);

  if (!isMember) {
    return (
      <View style={themedStyles.centeredState}>
        <Text style={themedStyles.stateText}>
          This feature is available to church members.
        </Text>
      </View>
    );
  }

  if (isLoadingPrayer && !assignment) {
    return (
      <View style={themedStyles.centeredState}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (hasPrayerError && !assignment) {
    return (
      <View style={themedStyles.centeredState}>
        <Text style={themedStyles.stateText}>
          We could not load today&apos;s prayer assignments.
        </Text>
        <Pressable
          style={themedStyles.retryButton}
          accessibilityRole="button"
          onPress={() => {
            void dispatch(fetchDailyPrayerAssignment());
          }}
        >
          <Text style={themedStyles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!assignment || assignment.members.length === 0) {
    return (
      <View style={themedStyles.centeredState}>
        <Text style={themedStyles.stateTitle}>No prayer assignments yet</Text>
        <Text style={themedStyles.stateText}>
          If you&apos;re new, you can generate your assignment for today now.
        </Text>
        <Pressable
          style={[
            themedStyles.retryButton,
            isLoadingPrayer ? themedStyles.retryButtonDisabled : null,
          ]}
          accessibilityRole="button"
          disabled={isLoadingPrayer}
          onPress={handleGenerateTodayAssignment}
        >
          <Text style={themedStyles.retryButtonText}>
            Get Today&apos;s Prayer Assignments
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={themedStyles.screen}>
      <Text style={themedStyles.headerTitle}>Pray for these members today</Text>
      {isFallback && assignmentDate ? (
        <View style={themedStyles.fallbackContainer}>
          <Text style={themedStyles.fallbackNote}>
            Showing assignments from {assignmentDate}.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={isLoadingPrayer}
            onPress={handleGenerateTodayAssignment}
          >
            <Text
              style={[
                themedStyles.fallbackActionText,
                isLoadingPrayer ? themedStyles.retryButtonDisabled : null,
              ]}
            >
              Get today&apos;s prayer assignment
            </Text>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        data={assignment.members}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={themedStyles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingPrayer}
            onRefresh={() => {
              void dispatch(fetchDailyPrayerAssignment());
            }}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <DailyPrayerRow member={item} themedStyles={themedStyles} />
        )}
      />
    </View>
  );
};

/* eslint-enable unicorn/no-null */
