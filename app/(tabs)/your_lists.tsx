import AlbumCard from "@/components/AlbumCard";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import SongCard from "@/components/SongCard";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";

interface BaseReview {
  id: string;
  rating: number;
  reviewCount: number;
}

interface UserAlbum extends BaseReview{
  albumName: string;
  albumArtUrl?: string;
}

interface UserSong extends BaseReview {
  songName: string;
  songArtUrl?: string; // will probably be the album art
}

type TabType = "Albums" | "Songs";

export default function YourListsScreen() {
  const router = useRouter();
  const [albums, setAlbums] = useState<UserAlbum[]>([]);
  const [songs, setSongs] = useState<UserSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("Albums");
  const [sortAsc, setSortAsc] = useState(false); // false = descending by default

  const {width} = useWindowDimensions();
  const numColumns = width >= 1024 ? 4 : width >= 768 ? 3 : 2; // responsive column count based on screen width

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

      // Fetch song reviews
      const { data: songData, error: songError } = await supabase
        .from("SongReview")
        .select(`
          song_id,
          song_review_rating,
          Song (
            song_id,
            song_title,
            SongAlbum (
              Album (
                album_art_url
              )
            )
          )
        `)
        .eq("user_id", authUser.id)
        .order("song_review_date", { ascending: false });

      if (songError) {
        setError("Failed to load your list");
        return;
      }

      const songMap = new Map<string, UserSong>();
      (songData || []).forEach((review: any) => {
        const songId = review.Song?.song_id || review.song_id;
        const songName = review.Song?.song_title || "Unknown Song";
        const songArtUrl = review.Song?.SongAlbum?.[0]?.Album?.album_art_url;
        const rating = Math.round(review.song_review_rating) || 0;

        if (songMap.has(songId)) {
          const existing = songMap.get(songId)!;
          existing.reviewCount += 1;
        } else {
          songMap.set(songId, {
            id: songId,
            songName: songName,
            songArtUrl: songArtUrl || undefined,
            rating: rating,
            reviewCount: 1,
          });
        }
      });      

      setSongs(Array.from(songMap.values()));

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

  //so we can switch if we're viewing on ascending or descending order based on rating
  const getSortedAlbums = () => {
    return [...albums].sort((a, b) =>
      sortAsc ? a.rating - b.rating : b.rating - a.rating
    );
  };

  const getSortedSongs = () => {
    return [...songs].sort((a, b) =>
      sortAsc ? a.rating - b.rating : b.rating - a.rating
    );
  };

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
  if (loading && albums.length === 0 && songs.length === 0) {
    return <LoadingState />;
  }
  
  // determine which data to show based on active tab and whether it's empty or not
  const activeData : BaseReview[] = activeTab === "Albums" ? getSortedAlbums() : getSortedSongs();
  const isEmpty = !loading && activeData.length === 0;

  // Displays populated state if album/song data exists for the user, otherwise shows empty state
  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["Albums", "Songs"] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort controls */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Score</Text>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortAsc((prev) => !prev)}
        >
          <Text style={styles.sortBtnText}>
            {sortAsc ? "↑ Low to high" : "↓ High to low"}
          </Text>
        </TouchableOpacity>
      </View>

      {isEmpty ? (
        <EmptyState
          icon="bookmark-outline"
          message={`No ${activeTab.toLowerCase()} reviewed yet`}
          description={`Start reviewing ${activeTab.toLowerCase()} to build your personal collection.`}
          buttonText="Make some reviews"
          onButtonClick={handleMakeReviews}
        />
      ) : (
        <FlatList<BaseReview>
          key={numColumns} //forces remount when numColumns changes to reset layout
          data={activeData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            activeTab === "Albums" ? (
              <AlbumCard
                albumName={(item as UserAlbum).albumName}
                albumImage={(item as UserAlbum).albumArtUrl}
                rating={item.rating}
                reviewCount={item.reviewCount}
              />
            ) : (
              <SongCard
                songName={(item as UserSong).songName}
                songImage={(item as UserSong).songArtUrl}
                rating={item.rating}
                reviewCount={item.reviewCount}
              />
            )
          }
          numColumns={numColumns}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: 16,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#1DB954",
    borderColor: "#1DB954",
  },
  tabText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    color: "#888",
    marginRight: 4,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  sortBtnActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  sortBtnText: {
    fontSize: 13,
    color: "#555",
  },
  sortBtnTextActive: {
    color: "#fff",
    fontWeight: "600",
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
