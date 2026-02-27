/* eslint-disable unicorn/no-null */
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { MemberAvatar } from "src/components";
import { selectIsMember } from "src/redux/authSlice";
import {
  fetchMemberDirectory,
  selectHasDirectoryError,
  selectIsLoadingDirectory,
  selectMemberDirectory,
} from "src/redux/memberSlice";
import { styles } from "./MemberDirectoryScreen.styles";

export const MemberDirectoryScreen: React.FunctionComponent = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const themedStyles = styles({ theme });
  const isMember = useAppSelector(selectIsMember);
  const members = useAppSelector(selectMemberDirectory);
  const isLoadingDirectory = useAppSelector(selectIsLoadingDirectory);
  const hasDirectoryError = useAppSelector(selectHasDirectoryError);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isMember) {
      return;
    }
    void dispatch(fetchMemberDirectory());
  }, [dispatch, isMember]);

  const filteredMembers = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) {
      return members;
    }

    return members.filter((member) =>
      member.displayName.toLowerCase().includes(trimmedQuery)
    );
  }, [members, searchQuery]);

  if (!isMember) {
    return (
      <View style={themedStyles.centeredState}>
        <Text style={themedStyles.stateText}>
          This feature is available to church members.
        </Text>
      </View>
    );
  }

  if (isLoadingDirectory && members.length === 0) {
    return (
      <View style={themedStyles.centeredState}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (hasDirectoryError && members.length === 0) {
    return (
      <View style={themedStyles.centeredState}>
        <Text style={themedStyles.stateText}>
          We could not load the member directory.
        </Text>
        <Pressable
          style={themedStyles.retryButton}
          accessibilityRole="button"
          onPress={() => {
            void dispatch(fetchMemberDirectory());
          }}
        >
          <Text style={themedStyles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={themedStyles.screen}
      data={filteredMembers}
      keyExtractor={(item) => item.uid}
      contentContainerStyle={themedStyles.contentContainer}
      contentInsetAdjustmentBehavior={
        Platform.OS === "ios" ? "automatic" : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={isLoadingDirectory}
          onRefresh={() => {
            void dispatch(fetchMemberDirectory());
          }}
          tintColor={theme.colors.primary}
        />
      }
      ListHeaderComponent={
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search members"
          placeholderTextColor={theme.colors.border}
          style={themedStyles.searchInput}
          accessibilityLabel="Search members by name"
          accessibilityHint="Type a name to filter the member directory."
          autoCapitalize="words"
        />
      }
      renderItem={({ item, index }) => (
        <>
          <View style={themedStyles.row} accessible accessibilityRole="text">
            <MemberAvatar
              size={44}
              photoURL={item.photoURL}
              displayName={item.displayName}
            />
            <Text style={themedStyles.rowName}>{item.displayName}</Text>
          </View>
          {index < filteredMembers.length - 1 ? (
            <View style={themedStyles.rowDivider} />
          ) : null}
        </>
      )}
      ListEmptyComponent={
        <View style={themedStyles.centeredState}>
          <Text style={themedStyles.stateText}>
            {searchQuery.trim()
              ? "No members match your search."
              : "No members have been added yet."}
          </Text>
        </View>
      }
    />
  );
};

/* eslint-enable unicorn/no-null */
