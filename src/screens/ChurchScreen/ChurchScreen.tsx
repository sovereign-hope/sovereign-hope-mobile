import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "src/style/colors";
import { WebView } from "react-native-webview";
import { useMiniPlayerHeight } from "src/hooks/useMiniPlayerHeight";

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
        style={[
          styles.webview,
          {
            paddingBottom: miniPlayerHeight,
          },
        ]}
      />
    </View>
  );
};
