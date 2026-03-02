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
  maximizedModalRoot: ViewStyle;
  maximizedSheetBackdrop: ViewStyle;
  maximizedSheetBackdropPressable: ViewStyle;
  maximizedContainerSheet: ViewStyle;
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

type Props = {
  isEinkMode?: boolean;
};

export const styles = ({ isEinkMode = false }: Props = {}): Style => {
  const foregroundColor = isEinkMode ? colors.black : colors.white;
  const panelBackgroundColor = isEinkMode ? colors.white : colors.blue;
  const overlayColor = isEinkMode
    ? "rgba(255,255,255,0.98)"
    : "rgba(7, 10, 18, 0.28)";

  return StyleSheet.create({
    // Minimized Player Styles
    minimizedPlayer: {
      position: "absolute",
      left: Platform.OS === "ios" ? spacing.large : spacing.medium,
      right: Platform.OS === "ios" ? spacing.large : spacing.medium,
      backgroundColor:
        Platform.OS === "ios" && !isEinkMode
          ? "transparent"
          : panelBackgroundColor,
      borderRadius: 28,
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: isEinkMode ? colors.black : "transparent",
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: isEinkMode ? 0 : Platform.OS === "ios" ? 0.24 : 0.15,
      shadowRadius: isEinkMode ? 0 : Platform.OS === "ios" ? 20 : 10,
      opacity: 1,
      height: 56,
      overflow: "hidden",
      elevation: isEinkMode ? 0 : 8,
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
      backgroundColor: isEinkMode ? colors.white : "rgba(8, 12, 24, 0.14)",
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
      color: foregroundColor,
      fontWeight: "700",
      fontSize: 16,
      lineHeight: 18,
    },
    trackArtist: {
      ...body,
      color: foregroundColor,
      opacity: isEinkMode ? 1 : 0.9,
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
    maximizedModalRoot: {
      flex: 1,
    },
    maximizedSheetBackdrop: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.large,
      backgroundColor: isEinkMode ? colors.white : "rgba(0,0,0,0.45)",
    },
    maximizedSheetBackdropPressable: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    maximizedContainer: {
      flex: 1,
      backgroundColor:
        Platform.OS === "ios" && !isEinkMode
          ? "transparent"
          : panelBackgroundColor,
      paddingTop: 0,
    },
    maximizedContainerSheet: {
      width: "100%",
      maxWidth: 760,
      maxHeight: "92%",
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: isEinkMode ? colors.black : "rgba(255, 255, 255, 0.18)",
      overflow: "hidden",
      alignSelf: "center",
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
      backgroundColor: overlayColor,
    },
    maximizedHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.large,
      paddingVertical: spacing.small,
      borderBottomWidth: 1,
      borderBottomColor: isEinkMode ? colors.black : "rgba(255, 255, 255, 0.1)",
    },
    maximizedCloseButton: {
      padding: spacing.small,
    },
    maximizedTitle: {
      ...header3,
      color: foregroundColor,
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
      elevation: isEinkMode ? 0 : 8,
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: isEinkMode ? colors.black : "transparent",
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
      color: foregroundColor,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: spacing.small,
    },
    maximizedTrackArtist: {
      ...body,
      color: foregroundColor,
      opacity: isEinkMode ? 1 : 0.9,
      textAlign: "center",
      marginBottom: spacing.small,
    },
    maximizedTrackAlbum: {
      ...body,
      color: foregroundColor,
      opacity: isEinkMode ? 1 : 0.7,
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
      backgroundColor: isEinkMode ? colors.grey : "rgba(255, 255, 255, 0.3)",
      borderRadius: 3,
      position: "relative",
    },
    maximizedScrubberProgress: {
      height: 6,
      backgroundColor: foregroundColor,
      borderRadius: 3,
      position: "absolute",
      top: 0,
      left: 0,
    },
    maximizedScrubberHandle: {
      width: 20,
      height: 20,
      backgroundColor: foregroundColor,
      borderRadius: 10,
      position: "absolute",
      top: -7,
      marginLeft: -10,
      shadowColor: colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: isEinkMode ? 0 : 0.25,
      shadowRadius: isEinkMode ? 0 : 4,
      elevation: isEinkMode ? 0 : 4,
    },
    maximizedTimeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    maximizedTimeText: {
      ...body,
      color: foregroundColor,
      opacity: isEinkMode ? 1 : 0.8,
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
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: isEinkMode ? colors.black : "transparent",
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
      color: foregroundColor,
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
      backgroundColor: isEinkMode ? colors.white : "rgba(255, 255, 255, 0.2)",
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: isEinkMode ? colors.black : "transparent",
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
      color: foregroundColor,
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
      backgroundColor: isEinkMode ? colors.white : "rgba(255, 255, 255, 0.1)",
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: isEinkMode ? colors.black : "transparent",
      minWidth: 120,
    },
    maximizedPlaybackOptionButtonActive: {
      backgroundColor: isEinkMode ? colors.white : colors.green,
      borderWidth: isEinkMode ? 2 : 0,
      borderColor: isEinkMode ? colors.black : "transparent",
    },
    maximizedPlaybackOptionLabel: {
      ...body,
      color: foregroundColor,
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
      backgroundColor: isEinkMode ? colors.white : "rgba(255, 255, 255, 0.1)",
      borderWidth: isEinkMode ? 1 : 0,
      borderColor: isEinkMode ? colors.black : "transparent",
      minWidth: 50,
      alignItems: "center",
    },
    maximizedPlaybackRateButtonActive: {
      backgroundColor: isEinkMode ? colors.white : colors.green,
      borderWidth: isEinkMode ? 2 : 0,
      borderColor: isEinkMode ? colors.black : "transparent",
    },
    maximizedPlaybackRateText: {
      ...body,
      color: foregroundColor,
      fontWeight: "500",
      fontSize: 13,
    },
    maximizedPlaybackRateTextActive: {
      color: foregroundColor,
      fontWeight: "700",
    },
  });
};
