import ActivityCard from "@/components/ActivityCard";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

interface ReviewActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  itemName: string;
  itemType: "Album" | "Song";
  reviewText: string;
  rating: number;
  timestamp: string;
  createdAt: string;
}

export default function Index() {
  const router = useRouter();
  const [activities, setActivities] = useState<ReviewActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load feed activity from following list
   * Fetches recent AlbumReview and SongReview from all users the current user follows
   */
  const loadFeed = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current authenticated user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setError("Unable to fetch feed");
        return;
      }

      // Fetch current user's following list
      const { data: followingRows, error: followingError } = await supabase
        .from("Follow")
        .select("following_id")
        .eq("follower_id", authUser.id);

      if (followingError) {
        console.error("Error fetching following list:", followingError);
        setError("Failed to load feed");
        return;
      }

      if (!followingRows || followingRows.length === 0) {
        setActivities([]);
        return;
      }

      // Extract following user IDs
      const followingIds = followingRows.map((row: any) => row.following_id);

      const allActivities: ReviewActivity[] = [];

      // Fetch AlbumReview from following users
      const { data: albumReviews, error: albumError } = await supabase
        .from("AlbumReview")
        .select(
          `
          user_id,
          album_review_date,
          album_review_text,
          album_review_rating,
          User(user_username),
          Album(album_name)
        `,
        )
        .in("user_id", followingIds);

      if (!albumError && albumReviews) {
        albumReviews.forEach((item: any) => {
          allActivities.push({
            id: `album-${item.user_id}-${item.album_review_date}`,
            userId: item.user_id,
            userName: item.User?.user_username || "Unknown User",
            userAvatar: undefined,
            itemName: item.Album?.album_name || "Unknown Album",
            itemType: "Album",
            reviewText: item.album_review_text || "",
            rating: Math.round(item.album_review_rating) || 0,
            timestamp: item.album_review_date
              ? new Date(item.album_review_date).toLocaleDateString()
              : "Recently",
            createdAt: item.album_review_date || new Date().toISOString(),
          });
        });
      }

      // Fetch SongReview from following users
      const { data: songReviews, error: songError } = await supabase
        .from("SongReview")
        .select(
          `
          user_id,
          song_review_date,
          song_review_text,
          song_review_rating,
          User(user_username),
          Song(song_title)
        `,
        )
        .in("user_id", followingIds);

      if (!songError && songReviews) {
        songReviews.forEach((item: any) => {
          allActivities.push({
            id: `song-${item.user_id}-${item.song_review_date}`,
            userId: item.user_id,
            userName: item.User?.user_username || "Unknown User",
            userAvatar: undefined,
            itemName: item.Song?.song_title || "Unknown Song",
            itemType: "Song",
            reviewText: item.song_review_text || "",
            rating: Math.round(item.song_review_rating) || 0,
            timestamp: item.song_review_date
              ? new Date(item.song_review_date).toLocaleDateString()
              : "Recently",
            createdAt: item.song_review_date || new Date().toISOString(),
          });
        });
      }

      // Sort chronologically (newest first)
      allActivities.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setActivities(allActivities);
    } catch (err) {
      console.error("Exception loading feed:", err);
      setError("An error occurred while loading your feed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load feed on component mount
  useEffect(() => {
    loadFeed();
  }, []);

  // Handle pull-to-refresh

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  // Handle find friends button click
  const handleFindFriends = () => {
    // Navigate to search or friends discovery page
    router.push("/(tabs)/search");
  };

  // Loading state
  if (loading && activities.length === 0) {
    return <LoadingState />;
  }

  // Empty state
  if (!loading && (!activities || activities.length === 0)) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="heart-outline"
          message="It's quiet in here..."
          description="Follow friends to see their recent activity and discoveries."
          buttonText="Find Friends"
          onButtonClick={handleFindFriends}
        />
      </View>
    );
  }

  // Populated state
  return (
    <View style={styles.container}>
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ActivityCard
            userName={item.userName}
            userAvatar={item.userAvatar}
            albumVisited={`${item.itemName} (${item.itemType})`}
            review={item.reviewText}
            rating={item.rating}
            timestamp={item.timestamp}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        scrollEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
