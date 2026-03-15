import LogoutButton from "@/components/LogoutButton";
import ProfileHeader from "@/components/ProfileHeader";
import StateView from "@/components/StateView";
import StatGrid from "@/components/StatGrid";
import UsernameEdit from "@/components/UsernameEdit";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface UserData {
  user_id: string;
  user_username: string;
  user_first: string;
  user_last: string;
  user_email: string;
}

interface ProfileStats {
  followers_count: number;
  following_count: number;
  album_reviews_count: number;
  song_reviews_count: number;
}

type RatingTab = "All" | "Songs" | "Albums";

type RatingItem = {
  id: string;
  title: string;
  type: "Song" | "Album";
  rating: number;
  reviewText: string;
  reviewDate: string;
};

export default function Profile() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({
    followers_count: 0,
    following_count: 0,
    album_reviews_count: 0,
    song_reviews_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Ratings history
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<RatingTab>("All");

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) { setError("Unable to get current user"); return; }

      const { data: userData, error: userError } = await supabase
        .from("User")
        .select("user_id, user_username, user_first, user_last, user_email")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (userError) { setError("Failed to load user profile"); return; }

      if (!userData) {
        setUserData({
          user_id: authUser.id,
          user_username: authUser.email?.split("@")[0] || "User",
          user_first: authUser.user_metadata?.first_name || "User",
          user_last: authUser.user_metadata?.last_name || "Profile",
          user_email: authUser.email || "No email",
        });
      } else {
        setUserData(userData);
      }

      const { count: followersCount } = await supabase
        .from("Follow").select("*", { count: "exact", head: true }).eq("following_id", authUser.id);
      const { count: followingCount } = await supabase
        .from("Follow").select("*", { count: "exact", head: true }).eq("follower_id", authUser.id);
      const { count: albumReviewsCount } = await supabase
        .from("AlbumReview").select("*", { count: "exact", head: true }).eq("user_id", authUser.id);
      const { count: songReviewsCount } = await supabase
        .from("SongReview").select("*", { count: "exact", head: true }).eq("user_id", authUser.id);

      setStats({
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        album_reviews_count: albumReviewsCount || 0,
        song_reviews_count: songReviewsCount || 0,
      });

      // Load ratings history
      await loadRatings(authUser.id);
    } catch (err) {
      setError("An error occurred while loading your profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRatings = async (userId: string) => {
    setRatingsLoading(true);
    try {
      const results: RatingItem[] = [];

      // Fetch song reviews
      const { data: songReviews, error: songError } = await supabase
        .from("SongReview")
        .select(`
          song_review_rating,
          song_review_text,
          song_review_date,
          Song ( song_id, song_title )
        `)
        .eq("user_id", userId)
        .order("song_review_date", { ascending: false });

      if (!songError) {
        (songReviews || []).forEach((r: any) => {
          if (r.Song) {
            results.push({
              id: r.Song.song_id,
              title: r.Song.song_title,
              type: "Song",
              rating: r.song_review_rating,
              reviewText: r.song_review_text || "",
              reviewDate: r.song_review_date,
            });
          }
        });
      }

      // Fetch album reviews
      const { data: albumReviews, error: albumError } = await supabase
        .from("AlbumReview")
        .select(`
          album_review_rating,
          album_review_text,
          album_review_date,
          Album ( album_id, album_name )
        `)
        .eq("user_id", userId)
        .order("album_review_date", { ascending: false });

      if (!albumError) {
        (albumReviews || []).forEach((r: any) => {
          if (r.Album) {
            results.push({
              id: r.Album.album_id,
              title: r.Album.album_name,
              type: "Album",
              rating: r.album_review_rating,
              reviewText: r.album_review_text || "",
              reviewDate: r.album_review_date,
            });
          }
        });
      }

      // Sort all by date descending
      results.sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
      setRatings(results);
    } finally {
      setRatingsLoading(false);
    }
  };

  useEffect(() => { loadUserProfile(); }, []);

  const handleRefresh = () => { setRefreshing(true); loadUserProfile(); };

  const handleEditUsername = () => { setNewUsername(userData?.user_username || ""); setIsEditingUsername(true); };
  const handleCancelEdit = () => { setIsEditingUsername(false); setNewUsername(""); };

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) { Alert.alert("Error", "Username cannot be empty"); return; }
    if (!userData) { Alert.alert("Error", "User data not loaded"); return; }
    try {
      setIsSaving(true);
      const { error: updateError, count } = await supabase
        .from("User").update({ user_username: newUsername.trim() }).eq("user_id", userData.user_id);
      if (updateError) { Alert.alert("Error", "Failed to update username"); return; }
      if (count === 0) {
        const { error: insertError } = await supabase.from("User").insert({
          user_id: userData.user_id, user_username: newUsername.trim(),
          user_first: userData.user_first, user_last: userData.user_last, user_email: userData.user_email,
        });
        if (insertError) { Alert.alert("Error", "Failed to create user record"); return; }
      }
      setUserData({ ...userData, user_username: newUsername.trim() });
      setIsEditingUsername(false);
      setNewUsername("");
      Alert.alert("Success", "Username updated successfully");
      await loadUserProfile();
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const executeLogout = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) { Alert.alert("Error", "Failed to logout: " + error.message); return; }
      router.replace("/");
    };
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to logout?")) executeLogout();
      return;
    }
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: executeLogout },
    ]);
  };

  const handleRatingPress = (item: RatingItem) => {
    router.push({
      pathname: "/detail",
      params: { id: item.id, type: item.type, title: item.title },
    });
  };

  const typeColors: Record<string, string> = {
    Song: "#1DB954",
    Album: "#1E90FF",
  };

  const renderStars = (rating: number) => {
    const stars = Math.round(rating);
    return "★".repeat(stars) + "☆".repeat(5 - stars);
  };

  const filteredRatings =
    activeTab === "All"
      ? ratings
      : activeTab === "Songs"
      ? ratings.filter((r) => r.type === "Song")
      : ratings.filter((r) => r.type === "Album");

  const renderRatingItem = ({ item }: { item: RatingItem }) => (
    <TouchableOpacity style={styles.ratingItem} onPress={() => handleRatingPress(item)}>
      <View style={styles.ratingLeft}>
        <View style={[styles.typeBadge, { backgroundColor: typeColors[item.type] }]}>
          <Text style={styles.typeBadgeText}>{item.type}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ratingTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.ratingStars}>{renderStars(item.rating)}</Text>
          {item.reviewText ? (
            <Text style={styles.reviewText} numberOfLines={2}>{item.reviewText}</Text>
          ) : null}
          <Text style={styles.reviewDate}>
            {new Date(item.reviewDate).toLocaleDateString("en-US", {
              year: "numeric", month: "short", day: "numeric",
            })}
          </Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (loading) return <StateView type="loading" />;
  if (error || !userData) {
    return (
      <View style={styles.container}>
        <StateView type="error" message={error || undefined} onRetry={loadUserProfile} />
      </View>
    );
  }

  const statItems = [
    { label: "Followers", value: stats.followers_count },
    { label: "Following", value: stats.following_count },
    { label: "Album Reviews", value: stats.album_reviews_count },
    { label: "Song Reviews", value: stats.song_reviews_count },
  ];

  const TABS: RatingTab[] = ["All", "Songs", "Albums"];

  return (
    <FlatList
      style={styles.container}
      data={filteredRatings}
      keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
      renderItem={renderRatingItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={
        ratingsLoading ? null : (
          <Text style={styles.emptyText}>
            No {activeTab === "All" ? "reviews" : activeTab.toLowerCase()} yet.
          </Text>
        )
      }
      ListHeaderComponent={
        <>
          <ProfileHeader
            username={userData.user_username}
            firstName={userData.user_first}
            lastName={userData.user_last}
            email={userData.user_email}
          />
          <UsernameEdit
            username={userData.user_username}
            isEditing={isEditingUsername}
            newUsername={newUsername}
            isSaving={isSaving}
            onEditStart={handleEditUsername}
            onEditCancel={handleCancelEdit}
            onUsernameChange={setNewUsername}
            onSave={handleSaveUsername}
          />
          <StatGrid stats={statItems} />
          <LogoutButton onLogout={handleLogout} />

          {/* Ratings History Section */}
          <View style={styles.ratingsHeader}>
            <Text style={styles.ratingsTitle}>My Reviews</Text>
            <View style={styles.tabRow}>
              {TABS.map((tab) => (
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
          </View>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  ratingsHeader: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    backgroundColor: "#f9fafb",
  },
  ratingsTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 12 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: "#ddd", alignItems: "center",
  },
  tabActive: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  tabText: { fontSize: 13, color: "#555", fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
  ratingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  ratingLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 2 },
  typeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  ratingTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 2 },
  ratingStars: { fontSize: 14, color: "#f5a623", marginBottom: 2 },
  reviewText: { fontSize: 12, color: "#666", marginBottom: 2 },
  reviewDate: { fontSize: 11, color: "#aaa" },
  chevron: { fontSize: 20, color: "#ccc", marginLeft: 8 },
  emptyText: { color: "#aaa", textAlign: "center", marginTop: 20, fontSize: 15, paddingBottom: 40 },
});