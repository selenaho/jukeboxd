import React from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";

const { width } = useWindowDimensions();
const numColumns = width >= 1024 ? 4 : width >= 768 ? 3 : 2;
const cardWidth = (width - (numColumns + 1) * 25) / numColumns;

interface SongCardProps {
  songName: string;
  songImage?: string;
  rating: number;
  reviewCount: number;
}

export default function SongCard({
  songName,
  songImage,
  rating,
  reviewCount,
}: SongCardProps) {
  return (
    <View style={styles.card}>
      {/* song image or songholder */}
      <View style={styles.imageContainer}>
        {songImage ? (
          <Image source={{ uri: songImage }} style={styles.image} />
        ) : (
          <View style={styles.imagesongholder}>
            <Text style={styles.songholderText}>No Image</Text>
          </View>
        )}
      </View>

      {/* song info */}
      <View style={styles.content}>
        <Text style={styles.songName} numberOfLines={2}>
          {songName}
        </Text>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <View style={styles.starsContainer}>
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
          <Text style={styles.reviewCount}>({reviewCount})</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    width: cardWidth,
  },
  imageContainer: {
    width: "100%",
    backgroundColor: "#f3f4f6",
  },
  image: {
    width: cardWidth,
    height: cardWidth,
  },
  imagesongholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },
  songholderText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  content: {
    padding: 12,
  },
  songName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starsContainer: {
    flexDirection: "row",
    marginRight: 6,
  },
  star: {
    fontSize: 12,
    marginRight: 2,
  },
  reviewCount: {
    fontSize: 12,
    color: "#6b7280",
  },
});
