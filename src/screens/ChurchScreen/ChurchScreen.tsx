import React from "react";
import { StyleSheet } from "react-native";
import { colors } from "src/style/colors";
import { WebView } from "react-native-webview";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";
import { SafeAreaView } from "react-native-safe-area-context";

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.white,
  },
});

export const ChurchScreen: React.FunctionComponent = () => {
  const miniPlayerHeight = useMiniPlayerHeight();

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.fullScreen}>
      <WebView
        source={{ uri: "https://sovhope.churchcenter.com/home" }}
        startInLoadingState
        allowsBackForwardNavigationGestures
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        decelerationRate={0.998}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces
        style={[
          styles.webview,
          {
            paddingBottom: miniPlayerHeight,
          },
        ]}
      />
    </SafeAreaView>
  );
};
