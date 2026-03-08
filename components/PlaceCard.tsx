import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface PlaceCardProps {
  placeName: string;
  placeImage?: string;
  rating: number;
  reviewCount: number;
}

export default function PlaceCard({
  placeName,
  placeImage,
  rating,
  reviewCount,
}: PlaceCardProps) {
  return (
    <View style={styles.card}>
      {/* Place image or placeholder */}
      <View style={styles.imageContainer}>
        {placeImage ? (
          <Image source={{ uri: placeImage }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
      </View>

      {/* Place info */}
      <View style={styles.content}>
        <Text style={styles.placeName} numberOfLines={2}>
          {placeName}
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
  },
  imageContainer: {
    width: "100%",
    height: 160,
    backgroundColor: "#f3f4f6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },
  placeholderText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  content: {
    padding: 12,
  },
  placeName: {
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
