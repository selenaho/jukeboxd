import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function LoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
});
