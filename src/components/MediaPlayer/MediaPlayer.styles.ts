import {
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Platform,
  Dimensions,
} from "react-native";
import { radius, spacing } from "src/style/layout";
import { header3, body } from "src/style/typography";
import { colors } from "src/style/colors";
import { Theme } from "@react-navigation/native";

type Props = {
  theme: Theme;
};

interface Style {
  // Minimized Player Styles
  minimizedPlayer: ViewStyle;
  minimizedContent: ViewStyle;
  minimizedTrackInfo: ViewStyle;
  trackImageContainer: ViewStyle;
  trackImage: ImageStyle;
  trackImagePlaceholder: ViewStyle;
  trackDetails: ViewStyle;
  trackTitle: TextStyle;
  trackArtist: TextStyle;
  minimizedControls: ViewStyle;
  minimizedPlayButton: ViewStyle;
  minimizedCloseButton: ViewStyle;
  minimizedProgressBar: ViewStyle;
  minimizedProgressBarContainer: ViewStyle;
  minimizedScrubberTrack: ViewStyle;
  minimizedScrubberProgress: ViewStyle;
  minimizedScrubberHandle: ViewStyle;

  // Maximized Player Styles
  maximizedContainer: ViewStyle;
  maximizedHeader: ViewStyle;
  maximizedCloseButton: ViewStyle;
  maximizedTitle: TextStyle;
  maximizedStopButton: ViewStyle;
  maximizedContent: ViewStyle;
  maximizedTrackSection: ViewStyle;
  maximizedTrackImageContainer: ViewStyle;
  maximizedTrackImage: ImageStyle;
  maximizedTrackImagePlaceholder: ViewStyle;
  maximizedTrackInfo: ViewStyle;
  maximizedTrackTitle: TextStyle;
  maximizedTrackArtist: TextStyle;
  maximizedTrackAlbum: TextStyle;
  maximizedProgressSection: ViewStyle;
  maximizedProgressBar: ViewStyle;
  maximizedProgressBarContainer: ViewStyle;
  maximizedScrubberTrack: ViewStyle;
  maximizedScrubberProgress: ViewStyle;
  maximizedScrubberHandle: ViewStyle;
  maximizedTimeContainer: ViewStyle;
  maximizedTimeText: TextStyle;
  maximizedControls: ViewStyle;
  maximizedSecondaryControls: ViewStyle;
  maximizedSecondaryButton: ViewStyle;
  maximizedSecondaryButtonActive: ViewStyle;
  maximizedButtonWithLabel: ViewStyle;
  maximizedButtonLabel: TextStyle;
  maximizedSectionHeader: ViewStyle;
  maximizedPlaybackOptionsSection: ViewStyle;
  maximizedPlaybackOptionsButtons: ViewStyle;
  maximizedPlaybackOptionButton: ViewStyle;
  maximizedPlaybackOptionButtonActive: ViewStyle;
  maximizedPlaybackOptionLabel: TextStyle;
  maximizedMainControls: ViewStyle;
  maximizedPlayButton: ViewStyle;
  maximizedPlaybackRateSection: ViewStyle;
  maximizedSectionTitle: TextStyle;
  maximizedPlaybackRateButtons: ViewStyle;
  maximizedPlaybackRateButton: ViewStyle;
  maximizedPlaybackRateButtonActive: ViewStyle;
  maximizedPlaybackRateText: TextStyle;
  maximizedPlaybackRateTextActive: TextStyle;
}

export const styles = ({ theme }: Props): Style =>
  StyleSheet.create({
    // Minimized Player Styles
    minimizedPlayer: {
      position: "absolute",
      left: spacing.medium,
      right: spacing.medium,
      backgroundColor: colors.blue,
      borderTopLeftRadius: radius.large,
      borderTopRightRadius: radius.large,
      borderBottomLeftRadius: radius.large,
      borderBottomRightRadius: radius.large,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: -5,
      },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      opacity: 0.95,
      height: 80,
      zIndex: 1000,
    },
    minimizedContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.medium,
      paddingVertical: spacing.medium,
    },
    minimizedTrackInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    trackImageContainer: {
      width: 48,
      height: 48,
      marginRight: spacing.medium,
    },
    trackImage: {
      width: "100%",
      height: "100%",
      borderRadius: radius.small,
    },
    trackImagePlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.grey,
      borderRadius: radius.small,
      justifyContent: "center",
      alignItems: "center",
    },
    trackDetails: {
      flex: 1,
    },
    trackTitle: {
      ...body,
      color: colors.white,
      fontWeight: "600",
      fontSize: 15,
    },
    trackArtist: {
      ...body,
      color: colors.white,
      opacity: 0.8,
      fontSize: 14,
    },
    minimizedControls: {
      flexDirection: "row",
      alignItems: "center",
    },
    minimizedPlayButton: {
      padding: spacing.medium,
      marginRight: spacing.small,
    },
    minimizedCloseButton: {
      padding: spacing.medium,
    },
    minimizedProgressBar: {
      paddingHorizontal: spacing.medium,
      paddingTop: spacing.small,
      paddingBottom: spacing.medium,
    },
    minimizedProgressBarContainer: {
      flex: 1,
      paddingHorizontal: 8,
    },
    minimizedScrubberTrack: {
      height: 4,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      borderRadius: 2,
      position: "relative",
    },
    minimizedScrubberProgress: {
      height: 4,
      backgroundColor: colors.white,
      borderRadius: 2,
      position: "absolute",
      top: 0,
      left: 0,
    },
    minimizedScrubberHandle: {
      width: 16,
      height: 16,
      backgroundColor: colors.white,
      borderRadius: 8,
      position: "absolute",
      top: -6,
      marginLeft: -8,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 3,
    },

    // Maximized Player Styles
    maximizedContainer: {
      flex: 1,
      backgroundColor: colors.blue,
      paddingTop: 0,
    },
    maximizedHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.large,
      paddingVertical: spacing.small,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(255, 255, 255, 0.1)",
    },
    maximizedCloseButton: {
      padding: spacing.small,
    },
    maximizedTitle: {
      ...header3,
      color: colors.white,
      fontWeight: "600",
    },
    maximizedStopButton: {
      padding: spacing.small,
    },
    maximizedContent: {
      flex: 1,
      paddingHorizontal: spacing.large,
    },
    maximizedTrackSection: {
      alignItems: "center",
      paddingVertical: spacing.medium,
      flex: 1,
      justifyContent: "center",
    },
    maximizedTrackImageContainer: {
      width: Platform.OS === "ios" ? "75%" : "80%",
      maxWidth: Platform.OS === "ios" ? 250 : 280,
      height: Platform.OS === "ios" ? 250 : 280,
      marginBottom: spacing.medium,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
      alignSelf: "center",
    },
    maximizedTrackImage: {
      width: "100%",
      height: "100%",
      borderRadius: radius.large,
    },
    maximizedTrackImagePlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.grey,
      borderRadius: radius.large,
      justifyContent: "center",
      alignItems: "center",
    },
    maximizedTrackInfo: {
      alignItems: "center",
    },
    maximizedTrackTitle: {
      ...header3,
      color: colors.white,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: spacing.small,
    },
    maximizedTrackArtist: {
      ...body,
      color: colors.white,
      opacity: 0.9,
      textAlign: "center",
      marginBottom: spacing.small,
    },
    maximizedTrackAlbum: {
      ...body,
      color: colors.white,
      opacity: 0.7,
      textAlign: "center",
      fontSize: 13,
    },
    maximizedProgressSection: {
      marginVertical: spacing.xs,
      minHeight: 32,
    },
    maximizedProgressBar: {
      marginBottom: spacing.xs,
    },
    maximizedProgressBarContainer: {
      flex: 1,
      paddingHorizontal: 8,
    },
    maximizedScrubberTrack: {
      height: 6,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      borderRadius: 3,
      position: "relative",
    },
    maximizedScrubberProgress: {
      height: 6,
      backgroundColor: colors.white,
      borderRadius: 3,
      position: "absolute",
      top: 0,
      left: 0,
    },
    maximizedScrubberHandle: {
      width: 20,
      height: 20,
      backgroundColor: colors.white,
      borderRadius: 10,
      position: "absolute",
      top: -7,
      marginLeft: -10,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
    maximizedTimeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    maximizedTimeText: {
      ...body,
      color: colors.white,
      opacity: 0.8,
      fontSize: 13,
    },
    maximizedControls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: "auto",
      marginBottom: spacing.medium,
      paddingHorizontal: spacing.large,
    },
    maximizedSecondaryControls: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    },
    maximizedSecondaryButton: {
      padding: spacing.medium,
      marginHorizontal: spacing.small,
      borderRadius: radius.medium,
    },
    maximizedSecondaryButtonActive: {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    maximizedButtonWithLabel: {
      alignItems: "center",
      justifyContent: "center",
    },
    maximizedButtonLabel: {
      ...body,
      color: colors.white,
      fontSize: 10,
      fontWeight: "500",
      marginTop: 2,
    },
    maximizedMainControls: {
      alignItems: "center",
      justifyContent: "center",
    },
    maximizedPlayButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginHorizontal: spacing.medium,
    },
    maximizedPlaybackRateSection: {
      marginTop: spacing.medium,
      marginBottom: spacing.small,
    },
    maximizedSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.medium,
    },
    maximizedSectionTitle: {
      ...body,
      color: colors.white,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: spacing.medium,
    },
    maximizedPlaybackOptionsSection: {
      marginTop: spacing.small,
      marginBottom: spacing.medium,
    },
    maximizedPlaybackOptionsButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    maximizedPlaybackOptionButton: {
      flexDirection: "column",
      alignItems: "center",
      paddingHorizontal: spacing.medium,
      paddingVertical: spacing.small,
      margin: spacing.small,
      borderRadius: radius.medium,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      minWidth: 120,
    },
    maximizedPlaybackOptionButtonActive: {
      backgroundColor: colors.green,
    },
    maximizedPlaybackOptionLabel: {
      ...body,
      color: colors.white,
      fontWeight: "500",
      fontSize: 13,
      marginTop: spacing.xs,
      marginLeft: 0,
      textAlign: "center",
    },
    maximizedPlaybackRateButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
    },
    maximizedPlaybackRateButton: {
      paddingHorizontal: spacing.medium,
      paddingVertical: spacing.small,
      margin: spacing.small,
      borderRadius: radius.medium,
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      minWidth: 50,
      alignItems: "center",
    },
    maximizedPlaybackRateButtonActive: {
      backgroundColor: colors.green,
    },
    maximizedPlaybackRateText: {
      ...body,
      color: colors.white,
      fontWeight: "500",
      fontSize: 13,
    },
    maximizedPlaybackRateTextActive: {
      color: colors.white,
      fontWeight: "700",
    },
  });
