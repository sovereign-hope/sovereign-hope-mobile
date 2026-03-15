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
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  View,
} from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
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

const ESTIMATED_ROW_HEIGHT = 60;
const ESTIMATED_HEADER_HEIGHT = 30;

export const MemberDirectoryScreen: React.FunctionComponent = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const themedStyles = useMemo(() => styles({ theme }), [theme]);
  const isMember = useAppSelector(selectIsMember);
  const isLoadingDirectory = useAppSelector(selectIsLoadingDirectory);
  const hasDirectoryError = useAppSelector(selectHasDirectoryError);
  const [searchQuery, setSearchQuery] = useState("");
  const listRef = useRef<SectionList<
    MemberProfile,
    RenderableDirectorySection
  > | null>(null);
  const sections = useAppSelector((state) =>
    selectFilteredDirectorySections(state, searchQuery)
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: "Search families or members",
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

  const estimateOffsetForSection = useCallback(
    (targetSectionIndex: number): number => {
      let offset = 0;

      for (let index = 0; index < targetSectionIndex; index += 1) {
        const section = renderableSections[index];
        if (!section) {
          break;
        }

        offset += ESTIMATED_HEADER_HEIGHT;
        offset += section.data.length * ESTIMATED_ROW_HEIGHT;
      }

      return offset;
    },
    [renderableSections]
  );

  const handleSelectLetter = useCallback(
    (letter: string) => {
      const sectionIndex = sectionIndexByLetter.get(letter);
      if (sectionIndex === undefined || !listRef.current) {
        return;
      }

      const scrollableNode = listRef.current.getScrollResponder();
      if (scrollableNode && "scrollTo" in scrollableNode) {
        const offset = estimateOffsetForSection(sectionIndex);
        (
          scrollableNode as {
            scrollTo: (options: { y: number; animated: boolean }) => void;
          }
        ).scrollTo({ y: offset, animated: true });
      }
    },
    [sectionIndexByLetter, estimateOffsetForSection]
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
    <>
      <SectionList
        ref={listRef}
        style={themedStyles.screen}
        automaticallyAdjustsScrollIndicatorInsets={false}
        scrollIndicatorInsets={{ right: 1 }}
        sections={renderableSections}
        keyExtractor={(item) => item.uid}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
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
          style={themedStyles.alphabetSidebar}
        />
      ) : undefined}
    </>
  );
};

/* eslint-enable unicorn/no-null */
