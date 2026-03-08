import ActivityCard from "@/components/ActivityCard";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

interface AlbumReviewActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  albumName: string;
  reviewText: string;
  rating: number;
  timestamp: string;
  createdAt: string;
}

export default function Index() {
  const router = useRouter();
  const [activities, setActivities] = useState<AlbumReviewActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load feed activity from Supabase
   * Fetches recent activity from friends
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

      // Fetch friend activity from Supabase - AlbumReview data
      const { data, error } = await supabase
        .from("AlbumReview")
        .select(
          `
          album_review_id,
          user_id,
          album_review_date,
          album_review_text,
          album_review_rating,
          User(user_username),
          Album(album_name)
        `,
        )
        .order("album_review_date", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching feed:", error);
        setError("Failed to load feed");
        return;
      }

      // Transform data to match AlbumReviewActivity interface
      const transformedActivities: AlbumReviewActivity[] = (data || []).map(
        (item: any) => ({
          id: String(item.album_review_id),
          userId: item.user_id,
          userName: item.User?.user_username || "Unknown User",
          userAvatar: undefined,
          albumName: item.Album?.album_name || "Unknown Album",
          reviewText: item.album_review_text || "",
          rating: Math.round(item.album_review_rating) || 0,
          timestamp: item.album_review_date
            ? new Date(item.album_review_date).toLocaleDateString()
            : "Recently",
          createdAt: item.album_review_date || new Date().toISOString(),
        }),
      );

      setActivities(transformedActivities);
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

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  /**
   * Handle find friends button click
   */
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
            placeVisited={item.albumName}
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
