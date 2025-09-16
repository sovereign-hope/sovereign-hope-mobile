import React from "react";
import { StyleSheet, View } from "react-native";
import { useStatusBarHeight } from "src/hooks/useStatusBarHeight";
import { colors } from "src/style/colors";
import { WebView } from "react-native-webview";

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
  const statusBarHeight = useStatusBarHeight();

  return (
    <View style={styles.fullScreen}>
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
        style={[styles.webview, { paddingTop: statusBarHeight }]}
      />
    </View>
  );
};
