import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface ActivityCardProps {
  userAvatar?: string;
  userName: string;
  albumVisited: string;
  review: string;
  rating: number;
  timestamp: string;
}

export default function ActivityCard({
  userAvatar,
  userName,
  albumVisited,
  review,
  rating,
  timestamp,
}: ActivityCardProps) {
  // Generate initials for avatar fallback
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <View style={styles.card}>
      {/* Header with avatar and user info */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </View>

      {/* album and review info */}
      <View style={styles.content}>
        <Text style={styles.albumVisited}>{albumVisited}</Text>

        {/* Rating stars */}
        <View style={styles.ratingContainer}>
          {[...Array(5)].map((_, i) => (
            <Text
              key={i}
              style={[
                styles.star,
                { color: i < rating ? "#f59e0b" : "#e5e7eb" },
              ]}
            >
              ★
            </Text>
          ))}
        </View>

        <Text style={styles.review} numberOfLines={2}>
          {review}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: "#9ca3af",
  },
  content: {
    marginLeft: 52,
  },
  albumVisited: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  star: {
    fontSize: 14,
    marginRight: 4,
  },
  review: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
});
