import {
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Platform,
} from "react-native";
import { radius, spacing } from "src/style/layout";
import { header3, body } from "src/style/typography";
import { colors } from "src/style/colors";

interface Style {
  // Minimized Player Styles
  minimizedPlayer: ViewStyle;
  minimizedGlassBlur: ViewStyle;
  minimizedGlassOverlay: ViewStyle;
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
  maximizedGlassBlur: ViewStyle;
  maximizedGlassOverlay: ViewStyle;
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

export const styles = (): Style =>
  StyleSheet.create({
    // Minimized Player Styles
    minimizedPlayer: {
      position: "absolute",
      left: Platform.OS === "ios" ? spacing.large : spacing.medium,
      right: Platform.OS === "ios" ? spacing.large : spacing.medium,
      backgroundColor: Platform.OS === "ios" ? "transparent" : colors.blue,
      borderRadius: 28,
      borderWidth: 0,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: Platform.OS === "ios" ? 0.24 : 0.15,
      shadowRadius: Platform.OS === "ios" ? 20 : 10,
      opacity: 1,
      height: 56,
      overflow: "hidden",
      elevation: 8,
      zIndex: 1000,
    },
    minimizedGlassBlur: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    minimizedGlassOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(8, 12, 24, 0.14)",
    },
    minimizedContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.medium,
      paddingVertical: spacing.xs,
      height: "100%",
    },
    minimizedTrackInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    trackImageContainer: {
      width: 28,
      height: 28,
      marginRight: spacing.small,
    },
    trackImage: {
      width: "100%",
      height: "100%",
      borderRadius: 7,
    },
    trackImagePlaceholder: {
      width: "100%",
      height: "100%",
      backgroundColor: colors.grey,
      borderRadius: 7,
      justifyContent: "center",
      alignItems: "center",
    },
    trackDetails: {
      flex: 1,
      justifyContent: "center",
    },
    trackTitle: {
      ...body,
      color: colors.white,
      fontWeight: "700",
      fontSize: 16,
      lineHeight: 18,
    },
    trackArtist: {
      ...body,
      color: colors.white,
      opacity: 0.9,
      fontSize: 12,
      lineHeight: 14,
    },
    minimizedControls: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: spacing.medium,
    },
    minimizedPlayButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.medium,
    },
    minimizedCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
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
      backgroundColor: Platform.OS === "ios" ? "transparent" : colors.blue,
      paddingTop: 0,
    },
    maximizedGlassBlur: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    maximizedGlassOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(7, 10, 18, 0.28)",
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
