/* eslint-disable unicorn/no-null */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "src/hooks/store";
import { AlphabetSidebar, MemberAvatar } from "src/components";
import { selectIsMember } from "src/redux/authSlice";
import {
  DirectorySection,
  fetchMemberDirectory,
  selectHasDirectoryError,
  selectFilteredDirectorySections,
  selectIsLoadingDirectory,
} from "src/redux/memberSlice";
import { MemberProfile } from "src/services/members";
import { styles } from "./MemberDirectoryScreen.styles";

interface RenderableDirectorySection extends DirectorySection {
  showLetterHeader: boolean;
}

export const MemberDirectoryScreen: React.FunctionComponent = () => {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const themedStyles = useMemo(() => styles({ theme }), [theme]);
  const isMember = useAppSelector(selectIsMember);
  const isLoadingDirectory = useAppSelector(selectIsLoadingDirectory);
  const hasDirectoryError = useAppSelector(selectHasDirectoryError);
  const [searchQuery, setSearchQuery] = useState("");
  const [headerHeight, setHeaderHeight] = useState(0);
  const listRef = useRef<SectionList<
    MemberProfile,
    RenderableDirectorySection
  > | null>(null);
  const lastScrollRequestRef = useRef<{
    sectionIndex: number;
    itemIndex: number;
  } | null>(null);
  const sections = useAppSelector((state) =>
    selectFilteredDirectorySections(state, searchQuery)
  );

  useEffect(() => {
    if (!isMember) {
      return;
    }
    void dispatch(fetchMemberDirectory());
  }, [dispatch, isMember]);

  const renderableSections = useMemo<Array<RenderableDirectorySection>>(
    () =>
      sections.map((section, index) => ({
        ...section,
        showLetterHeader:
          index === 0 || sections[index - 1]?.letter !== section.letter,
      })),
    [sections]
  );

  const availableLetters = useMemo(() => {
    return new Set(
      renderableSections
        .map((section) => section.letter)
        .filter((letter) => /^[A-Z]$/.test(letter))
    );
  }, [renderableSections]);

  const sectionIndexByLetter = useMemo(() => {
    const nextMap = new Map<string, number>();

    renderableSections.forEach((section, index) => {
      if (!nextMap.has(section.letter)) {
        nextMap.set(section.letter, index);
      }
    });

    return nextMap;
  }, [renderableSections]);

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    setHeaderHeight(event.nativeEvent.layout.height);
  }, []);

  const handleSelectLetter = (letter: string) => {
    const sectionIndex = sectionIndexByLetter.get(letter);
    if (sectionIndex === undefined || !listRef.current) {
      return;
    }

    lastScrollRequestRef.current = {
      sectionIndex,
      itemIndex: 0,
    };
    listRef.current.scrollToLocation({
      sectionIndex,
      itemIndex: 0,
      viewPosition: 0,
    });
  };

  if (!isMember) {
    return (
      <View style={themedStyles.centeredState}>
        <Text style={themedStyles.stateText}>
          This feature is available to church members.
        </Text>
      </View>
    );
  }

  if (isLoadingDirectory && renderableSections.length === 0) {
    return (
      <View style={themedStyles.centeredState}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (hasDirectoryError && renderableSections.length === 0) {
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
    <View style={themedStyles.container}>
      <SectionList
        ref={listRef}
        style={themedStyles.screen}
        sections={renderableSections}
        keyExtractor={(item) => item.uid}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={7}
        initialNumToRender={15}
        contentContainerStyle={[
          themedStyles.contentContainer,
          renderableSections.length === 0
            ? themedStyles.emptyContentContainer
            : null,
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
        onScrollToIndexFailed={() => {
          const lastScrollRequest = lastScrollRequestRef.current;
          if (!lastScrollRequest || !listRef.current) {
            return;
          }

          setTimeout(() => {
            listRef.current?.scrollToLocation({
              sectionIndex: lastScrollRequest.sectionIndex,
              itemIndex: lastScrollRequest.itemIndex,
              viewPosition: 0,
            });
          }, 250);
        }}
        ListHeaderComponent={
          <View onLayout={handleHeaderLayout}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search families or members"
              placeholderTextColor={theme.colors.border}
              style={themedStyles.searchInput}
              accessibilityLabel="Search families or members by name"
              accessibilityHint="Type a family or member name to filter the directory."
              autoCapitalize="words"
            />
          </View>
        }
        renderItem={({ item, index, section }) => {
          const isLastItemInSection = index === section.data.length - 1;

          return (
            <>
              <View
                style={themedStyles.row}
                accessible
                accessibilityRole="text"
              >
                <MemberAvatar
                  size={44}
                  photoURL={item.photoURL}
                  displayName={item.displayName}
                />
                <Text style={themedStyles.rowName}>{item.displayName}</Text>
              </View>
              {isLastItemInSection ? (
                section.isSingleMember ? undefined : (
                  <View style={themedStyles.sectionSpacer} />
                )
              ) : (
                <View style={themedStyles.rowDivider} />
              )}
            </>
          );
        }}
        renderSectionHeader={({ section }) => (
          <View>
            {section.showLetterHeader ? (
              <View style={themedStyles.letterHeaderContainer}>
                <Text style={themedStyles.letterHeaderText}>
                  {section.letter}
                </Text>
              </View>
            ) : undefined}
            {section.isSingleMember ? undefined : (
              <View style={themedStyles.sectionHeaderContainer}>
                <Text style={themedStyles.sectionHeaderText}>
                  {section.title}
                </Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={themedStyles.centeredState}>
            <Text style={themedStyles.stateText}>
              {searchQuery.trim()
                ? "No families or members match your search."
                : "No members have been added yet."}
            </Text>
          </View>
        }
      />
      {!searchQuery.trim() && availableLetters.size > 0 ? (
        <AlphabetSidebar
          availableLetters={availableLetters}
          onSelectLetter={handleSelectLetter}
          style={[themedStyles.alphabetSidebar, { top: headerHeight }]}
        />
      ) : undefined}
    </View>
  );
};

/* eslint-enable unicorn/no-null */
