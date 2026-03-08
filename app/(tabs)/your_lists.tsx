import AlbumCard from "@/components/AlbumCard";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

interface UserAlbum {
  id: string;
  albumName: string;
  albumArtUrl?: string;
  rating: number;
  reviewCount: number;
}

export default function YourListsScreen() {
  const router = useRouter();
  const [albums, setAlbums] = useState<UserAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load user's reviewed albums from Supabase
   */
  const loadMyList = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current authenticated user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setError("Unable to fetch your list");
        return;
      }

      // Fetch user's album reviews from Supabase
      const { data, error } = await supabase
        .from("AlbumReview")
        .select(
          `
          album_review_id,
          album_id,
          album_review_rating,
          Album(album_id, album_name, album_art_url)
        `,
        )
        .eq("user_id", authUser.id)
        .order("album_review_date", { ascending: false });

      if (error) {
        console.error("Error fetching reviews:", error);
        setError("Failed to load your list");
        return;
      }

      // Aggregate reviews by album and count them
      const albumMap = new Map<string, UserAlbum>();
      (data || []).forEach((review: any) => {
        const albumId = review.Album?.album_id || review.album_id;
        const albumName = review.Album?.album_name || "Unknown Album";
        const albumArtUrl = review.Album?.album_art_url;
        const rating = Math.round(review.album_review_rating) || 0;

        if (albumMap.has(albumId)) {
          const existing = albumMap.get(albumId)!;
          existing.reviewCount += 1;
        } else {
          albumMap.set(albumId, {
            id: albumId,
            albumName: albumName,
            albumArtUrl: albumArtUrl || undefined,
            rating: rating,
            reviewCount: 1,
          });
        }
      });

      setAlbums(Array.from(albumMap.values()));
    } catch (err) {
      console.error("Exception loading my list:", err);
      setError("An error occurred while loading your list");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load list on component mount
  useEffect(() => {
    loadMyList();
  }, []);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadMyList();
  };

  /**
   * Handle make reviews button click
   */
  const handleMakeReviews = () => {
    // Navigate to search or discovery page
    router.push("/(tabs)/search");
  };

  // Loading state
  if (loading && albums.length === 0) {
    return <LoadingState />;
  }

  // Empty state
  if (!loading && (!albums || albums.length === 0)) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="bookmark-outline"
          message="Your list is empty"
          description="Start reviewing albums to build your personal collection."
          buttonText="Make some reviews"
          onButtonClick={handleMakeReviews}
        />
      </View>
    );
  }

  // Populated state
  return (
    <View style={styles.container}>
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlbumCard
            albumName={item.albumName}
            albumImage={item.albumArtUrl}
            rating={item.rating}
            reviewCount={item.reviewCount}
          />
        )}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
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
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 12,
  },
});
