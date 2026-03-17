/* eslint-disable unicorn/no-null */
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { AlphabetSidebar, MemberAvatar } from "src/components";
import type { MemberAvatarHandle } from "src/components";
import { selectIsMember } from "src/redux/authSlice";
import {
  fetchMemberDirectory,
  selectHasDirectoryError,
  selectFilteredDirectorySections,
  selectIsLoadingDirectory,
} from "src/redux/memberSlice";
import { MemberProfile } from "src/services/members";
import { styles } from "./MemberDirectoryScreen.styles";

type DirectoryItem =
  | { type: "letter"; letter: string; key: string }
  | {
      type: "member";
      member: MemberProfile;
      isLast: boolean;
      key: string;
    };

const DirectoryMemberRow = ({
  member,
  isLast,
  themedStyles,
}: {
  member: MemberProfile;
  isLast: boolean;
  themedStyles: ReturnType<typeof styles>;
}) => {
  const avatarRef = useRef<MemberAvatarHandle>(null);
  return (
    <>
      <Pressable
        style={themedStyles.row}
        onPress={() => avatarRef.current?.showPhoto()}
        accessibilityRole="button"
        accessibilityLabel={`View photo of ${member.displayName}`}
        accessibilityHint="Opens an enlarged view of the member's photo"
      >
        <MemberAvatar
          ref={avatarRef}
          size={44}
          photoURL={member.photoURL}
          displayName={member.displayName}
        />
        <Text style={themedStyles.rowName}>{member.displayName}</Text>
      </Pressable>
      {isLast ? undefined : <View style={themedStyles.rowDivider} />}
    </>
  );
};

export const MemberDirectoryScreen: React.FunctionComponent = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const themedStyles = useMemo(() => styles({ theme }), [theme]);
  const isMember = useAppSelector(selectIsMember);
  const isLoadingDirectory = useAppSelector(selectIsLoadingDirectory);
  const hasDirectoryError = useAppSelector(selectHasDirectoryError);
  const [searchQuery, setSearchQuery] = useState("");
  const listRef = useRef<FlatList<DirectoryItem>>(null);
  const sections = useAppSelector((state) =>
    selectFilteredDirectorySections(state, searchQuery)
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: "Search members",
        hideWhenScrolling: false,
        autoCapitalize: "words" as const,
        onChangeText: (event: { nativeEvent: { text: string } }) => {
          setSearchQuery(event.nativeEvent.text);
        },
      },
    });
  }, [navigation]);

  useEffect(() => {
    if (!isMember) {
      return;
    }
    void dispatch(fetchMemberDirectory());
  }, [dispatch, isMember]);

  const { flatData, stickyHeaderIndices, letterOffsets, layoutTable } =
    useMemo(() => {
      const items: Array<DirectoryItem> = [];
      const stickyIndices: Array<number> = [];
      const offsets = new Map<string, number>();
      let lastLetter = "";

      for (const section of sections) {
        if (section.letter !== lastLetter) {
          stickyIndices.push(items.length);
          offsets.set(section.letter, items.length);
          items.push({
            type: "letter",
            letter: section.letter,
            key: `letter-${section.letter}`,
          });
          lastLetter = section.letter;
        }

        section.data.forEach((member, memberIndex) => {
          items.push({
            type: "member",
            member,
            isLast: memberIndex === section.data.length - 1,
            key: member.uid,
          });
        });
      }

      let cumulativeOffset = 0;
      const layoutTable = items.map((item, index) => {
        const length = getItemHeight(item);
        const entry = { length, offset: cumulativeOffset, index };
        cumulativeOffset += length;
        return entry;
      });

      return {
        flatData: items,
        stickyHeaderIndices: stickyIndices,
        letterOffsets: offsets,
        layoutTable,
      };
    }, [sections]);

  const availableLetters = useMemo(() => {
    return new Set(
      [...letterOffsets.keys()].filter((letter) => /^[A-Z]$/.test(letter))
    );
  }, [letterOffsets]);

  const handleSelectLetter = useCallback(
    (letter: string) => {
      const index = letterOffsets.get(letter);
      if (index === undefined || !listRef.current) {
        return;
      }

      listRef.current.scrollToIndex({ index, animated: false });
    },
    [letterOffsets]
  );

  const renderItem = useCallback(
    ({ item }: { item: DirectoryItem }) => {
      if (item.type === "letter") {
        return (
          <View style={themedStyles.letterHeaderContainer}>
            <Text style={themedStyles.letterHeaderText}>{item.letter}</Text>
          </View>
        );
      }

      return (
        <DirectoryMemberRow
          member={item.member}
          isLast={item.isLast}
          themedStyles={themedStyles}
        />
      );
    },
    [themedStyles]
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<DirectoryItem> | null | undefined, index: number) =>
      layoutTable[index] ?? { length: 0, offset: 0, index },
    [layoutTable]
  );

  if (!isMember) {
    return (
      <View style={themedStyles.centeredState}>
        <Text style={themedStyles.stateText}>
          This feature is available to church members.
        </Text>
      </View>
    );
  }

  if (isLoadingDirectory && flatData.length === 0) {
    return (
      <View style={themedStyles.centeredState}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (hasDirectoryError && flatData.length === 0) {
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
    <>
      <FlatList
        ref={listRef}
        style={themedStyles.screen}
        data={flatData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        getItemLayout={getItemLayout}
        stickyHeaderIndices={stickyHeaderIndices}
        keyboardShouldPersistTaps="handled"
        windowSize={5}
        maxToRenderPerBatch={15}
        initialNumToRender={20}
        removeClippedSubviews={Platform.OS === "android"}
        contentContainerStyle={[
          themedStyles.contentContainer,
          flatData.length === 0 ? themedStyles.emptyContentContainer : null,
        ]}
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
      {!searchQuery.trim() && availableLetters.size > 0 ? (
        <AlphabetSidebar
          availableLetters={availableLetters}
          onSelectLetter={handleSelectLetter}
          style={themedStyles.alphabetSidebar}
        />
      ) : undefined}
    </>
  );
};

const LETTER_HEADER_HEIGHT = 30;
const MEMBER_ROW_HEIGHT = 65;

function getItemHeight(item: DirectoryItem): number {
  switch (item.type) {
    case "letter": {
      return LETTER_HEADER_HEIGHT;
    }
    case "member": {
      return MEMBER_ROW_HEIGHT;
    }
  }
}

/* eslint-enable unicorn/no-null */
