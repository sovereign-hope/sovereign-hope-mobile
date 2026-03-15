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
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
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
import { styles } from "./MemberDirectoryScreen.styles";

interface RenderableDirectorySection extends DirectorySection {
  showLetterHeader: boolean;
}

export const MemberDirectoryScreen: React.FunctionComponent = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const themedStyles = useMemo(() => styles({ theme }), [theme]);
  const isMember = useAppSelector(selectIsMember);
  const isLoadingDirectory = useAppSelector(selectIsLoadingDirectory);
  const hasDirectoryError = useAppSelector(selectHasDirectoryError);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const sections = useAppSelector((state) =>
    selectFilteredDirectorySections(state, searchQuery)
  );
  const letterHeaderRefs = useRef(new Map<string, View>());
  const scrollOffsetRef = useRef(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    []
  );

  const renderScrollComponent = useCallback(
    (props: ScrollViewProps) => <ScrollView ref={scrollViewRef} {...props} />,
    []
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

  const handleSelectLetter = useCallback((letter: string) => {
    const headerView = letterHeaderRefs.current.get(letter);
    if (!headerView || !scrollViewRef.current) {
      return;
    }

    headerView.measureInWindow((_hx: number, hy: number) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const scrollNativeView: View | null =
        scrollViewRef.current?.getInnerViewNode() ?? null;
      if (!scrollNativeView) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      scrollNativeView.measureInWindow((_sx: number, sy: number) => {
        const offset = hy - sy + scrollOffsetRef.current;
        scrollViewRef.current?.scrollTo({ y: offset, animated: false });
      });
    });
  }, []);

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
        renderScrollComponent={renderScrollComponent}
        style={themedStyles.screen}
        automaticallyAdjustsScrollIndicatorInsets={false}
        scrollIndicatorInsets={{ right: 1 }}
        sections={renderableSections}
        keyExtractor={(item) => item.uid}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
          <View
            ref={
              section.showLetterHeader
                ? (ref) => {
                    if (ref) {
                      letterHeaderRefs.current.set(section.letter, ref);
                    }
                  }
                : undefined
            }
          >
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
