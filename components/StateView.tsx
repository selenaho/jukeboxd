import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface StateProps {
  type: "loading" | "error" | "empty";
  message?: string;
  onRetry?: () => void;
}

export default function StateView({ type, message, onRetry }: StateProps) {
  if (type === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  if (type === "error") {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={48}
            color="#ef4444"
          />
        </View>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>
          {message || "Failed to load your profile"}
        </Text>
        {onRetry && (
          <View style={styles.retryButtonContainer}>
            {/* Placeholder for retry button - will be handled in parent */}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="account-check"
          size={48}
          color="#6b7280"
        />
      </View>
      <Text style={styles.emptyTitle}>Welcome to Your Profile</Text>
      <Text style={styles.emptyMessage}>
        {message ||
          "Start reviewing albums and songs to see your activity here"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ef4444",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  retryButtonContainer: {
    marginTop: 16,
  },
});
