import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  id: string;
  type: "Song" | "Album";
  currentUserId: string | null;
};

export default function RatingSection({ id, type, currentUserId }: Props) {
  const [starRating, setStarRating] = useState(0);
  const [ratingNote, setRatingNote] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    setStarRating(0);
    setRatingNote("");
    setRatingSubmitted(false);
    fetchExistingReview();
  }, [id, type]);

  const fetchExistingReview = async () => {
    if (!currentUserId) return;
    try {
      if (type === "Song") {
        const { data } = await supabase
          .from("SongReview")
          .select("song_review_rating, song_review_text")
          .eq("song_id", id)
          .eq("user_id", currentUserId)
          .maybeSingle();
        if (data) {
          setStarRating(data.song_review_rating ?? 0);
          setRatingNote(data.song_review_text ?? "");
          setRatingSubmitted(true);
        }
      } else if (type === "Album") {
        const { data } = await supabase
          .from("AlbumReview")
          .select("album_review_rating, album_review_text")
          .eq("album_id", id)
          .eq("user_id", currentUserId)
          .maybeSingle();
        if (data) {
          setStarRating(data.album_review_rating ?? 0);
          setRatingNote(data.album_review_text ?? "");
          setRatingSubmitted(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (starRating === 0 || !currentUserId) return;
    try {
      if (type === "Song") {
        await supabase.from("SongReview").upsert({
          song_id: id,
          user_id: currentUserId,
          song_review_rating: starRating,
          song_review_text: ratingNote,
          song_review_date: new Date().toISOString(),
        });
      } else if (type === "Album") {
        await supabase.from("AlbumReview").upsert({
          album_id: id,
          user_id: currentUserId,
          album_review_rating: starRating,
          album_review_text: ratingNote,
          album_review_date: new Date().toISOString(),
        });
      }
      setRatingSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.ratingCard}>
      <Text style={styles.ratingLabel}>Your rating</Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setStarRating(star)}>
            <Text style={[styles.star, { color: star <= starRating ? "#E9A800" : "#ccc" }]}>
              {star <= starRating ? "★" : "☆"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.noteInput}
        placeholder="Add a note (optional)..."
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={3}
        value={ratingNote}
        onChangeText={setRatingNote}
      />

      <TouchableOpacity
        style={[styles.submitBtn, starRating === 0 && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={starRating === 0}
      >
        <Text style={styles.submitBtnText}>
          {ratingSubmitted ? "Update rating" : "Submit rating"}
        </Text>
      </TouchableOpacity>

      {ratingSubmitted && (
        <Text style={styles.successText}>Rating saved!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ratingCard: {
    marginTop: 16,
    marginHorizontal: 0,
    padding: 20,
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
  },
  ratingLabel: { fontSize: 13, fontWeight: "500", color: "#888", marginBottom: 12 },
  starsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  star: { fontSize: 32 },
  noteInput: {
    backgroundColor: "#fff",
    borderWidth: 0.5,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#222",
    minHeight: 72,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  submitBtn: {
    backgroundColor: "#1DB954",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#ccc" },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  successText: { textAlign: "center", color: "#1DB954", marginTop: 10, fontSize: 13 },
});