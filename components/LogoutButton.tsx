import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface LogoutButtonProps {
  onLogout: () => void;
  isLoading?: boolean;
}

export default function LogoutButton({
  onLogout,
  isLoading = false,
}: LogoutButtonProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={onLogout}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <>
            <MaterialCommunityIcons
              name="logout"
              size={18}
              color="#ef4444"
              style={styles.icon}
            />
            <Text style={styles.buttonText}>Logout</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  icon: {
    marginRight: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ef4444",
  },
});
