import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Sentry from "@sentry/react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#4A90D9",
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

/**
 * Error boundary that catches render errors in screen subtrees.
 * Logs to Sentry and shows a user-friendly fallback with retry.
 */
export class ScreenErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={48} color="#C94B41" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            An unexpected error occurred. Please try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => this.setState({ hasError: false })}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && { opacity: 0.65 },
            ]}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
