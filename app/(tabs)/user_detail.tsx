import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

type UserStats = {
  followers_count: number;
  following_count: number;
  album_reviews_count: number;
  song_reviews_count: number;
};

type UserProfile = {
  user_id: string;
  user_username: string;
  user_first: string;
  user_last: string;
};

type FollowUser = {
  user_id: string;
  user_username: string;
  user_first: string;
  user_last: string;
};

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // User and profile state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RatingTab>("All");

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Follow modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState<FollowModalTab>("Followers");
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  useEffect(() => {
    checkAndLoad();
  }, [id]);

  const checkAndLoad = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser && authUser.id === id) {
      router.replace("/(tabs)/profile");
      return;
    }
    setCurrentUserId(authUser?.id ?? null);
    await fetchUserProfile(authUser?.id ?? null);
  };

  const fetchUserProfile = async (authId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const { data: userRow, error: userError } = await supabase
        .from("User")
        .select("user_id, user_username, user_first, user_last")
        .eq("user_id", id)
        .single();
      if (userError) throw userError;
      setProfile(userRow);

      const [
        { count: follCount },
        { count: followingCount },
        { count: albumReviewsCount },
        { count: songReviewsCount },
        followCheck,
      ] = await Promise.all([
        supabase.from("Follow").select("*", { count: "exact", head: true }).eq("following_id", id),
        supabase.from("Follow").select("*", { count: "exact", head: true }).eq("follower_id", id),
        supabase.from("AlbumReview").select("*", { count: "exact", head: true }).eq("user_id", id),
        supabase.from("SongReview").select("*", { count: "exact", head: true }).eq("user_id", id),
        authId
          ? supabase.from("Follow").select("*", { count: "exact", head: true })
              .eq("follower_id", authId).eq("following_id", id)
          : Promise.resolve({ count: 0 }),
      ]);

      setIsFollowing((followCheck.count ?? 0) > 0);
      setStats({
        followers_count: follCount || 0,
        following_count: followingCount || 0,
        album_reviews_count: albumReviewsCount || 0,
        song_reviews_count: songReviewsCount || 0,
      });

      const results: RatingItem[] = [];

      const { data: songReviews, error: songError } = await supabase
        .from("SongReview")
        .select("song_review_rating, song_review_text, song_review_date, Song ( song_id, song_title )")
        .eq("user_id", id)
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
        .eq("user_id", id)
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowList = async () => {
    setFollowListLoading(true);
    try {
      // Fetch followers (people who follow this user)
      const { data: followerRows } = await supabase
        .from("Follow")
        .select("follower_id")
        .eq("following_id", id);

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

      // Fetch following (people this user follows)
      const { data: followingRows } = await supabase
        .from("Follow")
        .select("following_id")
        .eq("follower_id", id);

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

  const handleFollowToggle = async () => {
    if (!currentUserId) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("Follow")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", id);
        if (!error) {
          setIsFollowing(false);
          setStats((prev) => prev ? { ...prev, followers_count: Math.max(0, prev.followers_count - 1) } : prev);
        }
      } else {
        const { error } = await supabase
          .from("Follow")
          .insert({ follower_id: currentUserId, following_id: id });
        if (!error) {
          setIsFollowing(true);
          setStats((prev) => prev ? { ...prev, followers_count: prev.followers_count + 1 } : prev);
        }
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRatingPress = (item: RatingItem) => {
    router.push({ pathname: "/detail", params: { id: item.id, type: item.type, title: item.title } });
  };

  const typeColors = { Song: "#1DB954", Album: "#1E90FF" };
  const TABS: RatingTab[] = ["All", "Songs", "Albums"];
  const FOLLOW_TABS: FollowModalTab[] = ["Followers", "Following"];

  const renderStars = (rating: number) => {
    const stars = Math.round(rating);
    return "★".repeat(stars) + "☆".repeat(5 - stars);
  };

  const filteredRatings =
    activeTab === "All" ? ratings :
    activeTab === "Songs" ? ratings.filter((r) => r.type === "Song") :
    ratings.filter((r) => r.type === "Album");

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error ?? "User not found"}</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        data={filteredRatings}
        keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
        renderItem={renderRatingItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No {activeTab === "All" ? "reviews" : activeTab.toLowerCase()} yet.
          </Text>
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backText}>‹ Back</Text>
              </TouchableOpacity>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {profile.user_first?.[0]?.toUpperCase() ?? "?"}
                  {profile.user_last?.[0]?.toUpperCase() ?? ""}
                </Text>
              </View>
              <Text style={styles.fullName}>{profile.user_first} {profile.user_last}</Text>
              <Text style={styles.username}>@{profile.user_username}</Text>

              {/* Follow / Unfollow Button */}
              {currentUserId && (
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.unfollowBtn]}
                  onPress={handleFollowToggle}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? "#1DB954" : "#fff"} />
                  ) : (
                    <Text style={[styles.followBtnText, isFollowing && styles.unfollowBtnText]}>
                      {isFollowing ? "Unfollow" : "Follow"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Tappable Stats */}
            {stats && (
              <View style={styles.statsGrid}>
                {[
                  { label: "Followers", value: stats.followers_count, onPress: () => openModal("Followers") },
                  { label: "Following", value: stats.following_count, onPress: () => openModal("Following") },
                  { label: "Album Reviews", value: stats.album_reviews_count, onPress: undefined },
                  { label: "Song Reviews", value: stats.song_reviews_count, onPress: undefined },
                ].map((s) => (
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
            )}

            {/* Reviews Header + Tabs */}
            <View style={styles.reviewsHeader}>
              <Text style={styles.reviewsTitle}>Reviews</Text>
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>@{profile.user_username}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalTabRow}>
            {FOLLOW_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.modalTab, modalTab === tab && styles.modalTabActive]}
                onPress={() => setModalTab(tab)}
              >
                <Text style={[styles.modalTabText, modalTab === tab && styles.modalTabTextActive]}>
                  {tab} {tab === "Followers" ? stats?.followers_count : stats?.following_count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {followListLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#1DB954" />
            </View>
          ) : currentList.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No {modalTab.toLowerCase()} yet.</Text>
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
  header: {
    backgroundColor: "#fff", paddingTop: 60, paddingBottom: 24,
    paddingHorizontal: 24, alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  backBtn: { alignSelf: "flex-start", marginBottom: 16 },
  backText: { fontSize: 17, color: "#1DB954" },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#1DB954",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  fullName: { fontSize: 22, fontWeight: "800", color: "#111", marginBottom: 4 },
  username: { fontSize: 15, color: "#888", marginBottom: 16 },
  followBtn: {
    backgroundColor: "#1DB954", paddingHorizontal: 32, paddingVertical: 10,
    borderRadius: 20, minWidth: 120, alignItems: "center",
  },
  unfollowBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#1DB954" },
  followBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  unfollowBtnText: { color: "#1DB954" },
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap", backgroundColor: "#fff",
    padding: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  statItem: { width: "50%", alignItems: "center", paddingVertical: 12 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#111" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 2 },
  statLabelTappable: { color: "#1DB954", fontWeight: "600" },
  reviewsHeader: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 },
  reviewsTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 12 },
  tabRow: { flexDirection: "row", gap: 8 },
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
  errorText: { color: "red", textAlign: "center" },
  emptyText: { color: "#aaa", textAlign: "center", marginTop: 20, fontSize: 15, paddingBottom: 40 },
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