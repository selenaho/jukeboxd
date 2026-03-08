import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface ProfileHeaderProps {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function ProfileHeader({
  username,
  firstName,
  lastName,
  email,
}: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Avatar Circle */}
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {username.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* User Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.fullName}>
          {firstName} {lastName}
        </Text>
        <Text style={styles.email}>{email}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
  },
  infoContainer: {
    alignItems: "center",
  },
  username: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  fullName: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  email: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
