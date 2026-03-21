import LogoutButton from "@/components/LogoutButton";
import ProfileHeader from "@/components/ProfileHeader";
import StateView from "@/components/StateView";
import UsernameEdit from "@/components/UsernameEdit";
import { supabase } from "@/utils/supabase";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
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
type FollowModalTab = "Followers" | "Following";

type RatingItem = {
  id: string;
  title: string;
  type: "Song" | "Album";
  rating: number;
  reviewText: string;
  reviewDate: string;
};

type FollowUser = {
  user_id: string;
  user_username: string;
  user_first: string;
  user_last: string;
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

  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<RatingTab>("All");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState<FollowModalTab>("Followers");
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) { setError("Unable to get current user"); return; }

      const { data: userRow, error: userError } = await supabase
        .from("User")
        .select("user_id, user_username, user_first, user_last, user_email")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (userError) { setError("Failed to load user profile"); return; }

      setUserData(userRow ?? {
        user_id: authUser.id,
        user_username: authUser.email?.split("@")[0] || "User",
        user_first: authUser.user_metadata?.first_name || "User",
        user_last: authUser.user_metadata?.last_name || "Profile",
        user_email: authUser.email || "No email",
      });

      const [
        { count: followersCount },
        { count: followingCount },
        { count: albumReviewsCount },
        { count: songReviewsCount },
      ] = await Promise.all([
        supabase.from("Follow").select("*", { count: "exact", head: true }).eq("following_id", authUser.id),
        supabase.from("Follow").select("*", { count: "exact", head: true }).eq("follower_id", authUser.id),
        supabase.from("AlbumReview").select("*", { count: "exact", head: true }).eq("user_id", authUser.id),
        supabase.from("SongReview").select("*", { count: "exact", head: true }).eq("user_id", authUser.id),
      ]);

      setStats({
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        album_reviews_count: albumReviewsCount || 0,
        song_reviews_count: songReviewsCount || 0,
      });

      await loadRatings(authUser.id);
    } catch {
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

      const { data: songReviews, error: songError } = await supabase
        .from("SongReview")
        .select("song_review_rating, song_review_text, song_review_date, Song ( song_id, song_title )")
        .eq("user_id", userId)
        .order("song_review_date", { ascending: false });

      if (!songError) {
        (songReviews || []).forEach((r: any) => {
          if (r.Song) results.push({
            id: r.Song.song_id, title: r.Song.song_title, type: "Song",
            rating: r.song_review_rating, reviewText: r.song_review_text || "",
            reviewDate: r.song_review_date,
          });
        });
      }

      const { data: albumReviews, error: albumError } = await supabase
        .from("AlbumReview")
        .select("album_review_rating, album_review_text, album_review_date, Album ( album_id, album_name )")
        .eq("user_id", userId)
        .order("album_review_date", { ascending: false });

      if (!albumError) {
        (albumReviews || []).forEach((r: any) => {
          if (r.Album) results.push({
            id: r.Album.album_id, title: r.Album.album_name, type: "Album",
            rating: r.album_review_rating, reviewText: r.album_review_text || "",
            reviewDate: r.album_review_date,
          });
        });
      }

      results.sort((a, b) => new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime());
      setRatings(results);
    } finally {
      setRatingsLoading(false);
    }
  };

  const loadFollowList = async () => {
    if (!userData) return;
    setFollowListLoading(true);
    try {
      // Fetch followers
      const { data: followerRows } = await supabase
        .from("Follow")
        .select("follower_id")
        .eq("following_id", userData.user_id);

      if (followerRows && followerRows.length > 0) {
        const ids = followerRows.map((r: any) => r.follower_id);
        const { data: followerUsers } = await supabase
          .from("User")
          .select("user_id, user_username, user_first, user_last")
          .in("user_id", ids);
        setFollowers(followerUsers || []);
      } else {
        setFollowers([]);
      }

      // Fetch following
      const { data: followingRows } = await supabase
        .from("Follow")
        .select("following_id")
        .eq("follower_id", userData.user_id);

      if (followingRows && followingRows.length > 0) {
        const ids = followingRows.map((r: any) => r.following_id);
        const { data: followingUsers } = await supabase
          .from("User")
          .select("user_id, user_username, user_first, user_last")
          .in("user_id", ids);
        setFollowing(followingUsers || []);
      } else {
        setFollowing([]);
      }
    } finally {
      setFollowListLoading(false);
    }
  };

  const openModal = async (tab: FollowModalTab) => {
    setModalTab(tab);
    setModalVisible(true);
    await loadFollowList();
  };

  const handleFollowUserPress = (user: FollowUser) => {
    setModalVisible(false);
    router.push({ pathname: "/user_detail", params: { id: user.user_id } });
  };

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
    router.push({ pathname: "/detail", params: { id: item.id, type: item.type, title: item.title } });
  };

  const typeColors: Record<string, string> = { Song: "#1DB954", Album: "#1E90FF" };

  const renderStars = (rating: number) => {
    const stars = Math.round(rating);
    return "★".repeat(stars) + "☆".repeat(5 - stars);
  };

  const filteredRatings =
    activeTab === "All" ? ratings :
    activeTab === "Songs" ? ratings.filter((r) => r.type === "Song") :
    ratings.filter((r) => r.type === "Album");

  const TABS: RatingTab[] = ["All", "Songs", "Albums"];
  const FOLLOW_TABS: FollowModalTab[] = ["Followers", "Following"];

  const renderRatingItem = ({ item }: { item: RatingItem }) => (
    <TouchableOpacity style={styles.ratingItem} onPress={() => handleRatingPress(item)}>
      <View style={styles.ratingLeft}>
        <View style={[styles.typeBadge, { backgroundColor: typeColors[item.type] }]}>
          <Text style={styles.typeBadgeText}>{item.type}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ratingTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.ratingStars}>{renderStars(item.rating)}</Text>
          {item.reviewText ? <Text style={styles.reviewText} numberOfLines={2}>{item.reviewText}</Text> : null}
          <Text style={styles.reviewDate}>
            {new Date(item.reviewDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const renderFollowUser = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity style={styles.followUserRow} onPress={() => handleFollowUserPress(item)}>
      <View style={styles.followAvatar}>
        <Text style={styles.followAvatarText}>
          {item.user_first?.[0]?.toUpperCase() ?? "?"}{item.user_last?.[0]?.toUpperCase() ?? ""}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.followFullName}>{item.user_first} {item.user_last}</Text>
        <Text style={styles.followUsername}>@{item.user_username}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const currentList = modalTab === "Followers" ? followers : following;

  if (loading) return <StateView type="loading" />;
  if (error || !userData) {
    return (
      <View style={styles.container}>
        <StateView type="error" message={error || undefined} onRetry={loadUserProfile} />
      </View>
    );
  }

  const statItems = [
    { label: "Followers", value: stats.followers_count, onPress: () => openModal("Followers") },
    { label: "Following", value: stats.following_count, onPress: () => openModal("Following") },
    { label: "Album Reviews", value: stats.album_reviews_count },
    { label: "Song Reviews", value: stats.song_reviews_count },
  ];

  return (
    <>
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

            {/* Tappable Stats Grid */}
            <View style={styles.statsGrid}>
              {statItems.map((s) => (
                <TouchableOpacity
                  key={s.label}
                  style={styles.statItem}
                  onPress={s.onPress}
                  disabled={!s.onPress}
                >
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={[styles.statLabel, s.onPress && styles.statLabelTappable]}>
                    {s.label}{s.onPress ? " ›" : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <LogoutButton onLogout={handleLogout} />

            <View style={styles.ratingsHeader}>
              <Text style={styles.ratingsTitle}>My Reviews</Text>
              <View style={styles.tabRow}>
                {TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        }
      />

      {/* Followers / Following Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {userData.user_username}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Modal Tabs */}
          <View style={styles.modalTabRow}>
            {FOLLOW_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.modalTab, modalTab === tab && styles.modalTabActive]}
                onPress={() => setModalTab(tab)}
              >
                <Text style={[styles.modalTabText, modalTab === tab && styles.modalTabTextActive]}>
                  {tab} {tab === "Followers" ? stats.followers_count : stats.following_count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* List */}
          {followListLoading ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : currentList.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                No {modalTab.toLowerCase()} yet.
              </Text>
            </View>
          ) : (
            <FlatList
              data={currentList}
              keyExtractor={(item) => item.user_id}
              renderItem={renderFollowUser}
              contentContainerStyle={styles.modalListContent}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  statsGrid: {
    flexDirection: "row", flexWrap: "wrap",
    backgroundColor: "#fff", padding: 16,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  statItem: { width: "50%", alignItems: "center", paddingVertical: 12 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#111" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  statLabelTappable: { color: "#1DB954", fontWeight: "600" },

  // Ratings section
  ratingsHeader: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12, backgroundColor: "#f9fafb" },
  ratingsTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 12 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  tabActive: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  tabText: { fontSize: 13, color: "#555", fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
  ratingItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
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

  // Modal
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  modalCloseBtn: { padding: 4 },
  modalCloseText: { fontSize: 18, color: "#888" },
  modalTabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  modalTab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  modalTabActive: { borderBottomWidth: 2, borderBottomColor: "#1DB954" },
  modalTabText: { fontSize: 15, color: "#888", fontWeight: "600" },
  modalTabTextActive: { color: "#1DB954" },
  modalListContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  // Follow user row
  followUserRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f5",
  },
  followAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#1DB954", justifyContent: "center", alignItems: "center",
  },
  followAvatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  followFullName: { fontSize: 15, fontWeight: "700", color: "#111" },
  followUsername: { fontSize: 13, color: "#888" },
});