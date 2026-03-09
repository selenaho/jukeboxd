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
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
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

  /**
   * Load user profile data and stats from the authenticated session
   */
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the currently authenticated user from the session
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setError("Unable to get current user");
        return;
      }

      // Fetch the user profile from the database
      const { data: userData, error: userError } = await supabase
        .from("User")
        .select("user_id, user_username, user_first, user_last, user_email")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (userError) {
        console.error("Error fetching user profile:", userError);
        setError("Failed to load user profile");
        return;
      }

      if (!userData) {
        // Create a fallback user data object with auth user info
        const fallbackUserData: UserData = {
          user_id: authUser.id,
          user_username: authUser.email?.split("@")[0] || "User",
          user_first: authUser.user_metadata?.first_name || "User",
          user_last: authUser.user_metadata?.last_name || "Profile",
          user_email: authUser.email || "No email",
        };
        setUserData(fallbackUserData);
      } else {
        setUserData(userData);
      }

      // Fetch followers count (people following this user)
      const { count: followersCount } = await supabase
        .from("Follow")
        .select("*", { count: "exact", head: true })
        .eq("following_id", authUser.id);

      // Fetch following count (people this user is following)
      const { count: followingCount } = await supabase
        .from("Follow")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", authUser.id);

      // Fetch album reviews count
      const { count: albumReviewsCount } = await supabase
        .from("AlbumReview")
        .select("*", { count: "exact", head: true })
        .eq("user_id", authUser.id);

      // Fetch song reviews count
      const { count: songReviewsCount } = await supabase
        .from("SongReview")
        .select("*", { count: "exact", head: true })
        .eq("user_id", authUser.id);

      setStats({
        followers_count: followersCount || 0,
        following_count: followingCount || 0,
        album_reviews_count: albumReviewsCount || 0,
        song_reviews_count: songReviewsCount || 0,
      });
    } catch (err) {
      console.error("Exception loading profile:", err);
      setError("An error occurred while loading your profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load user profile when component mounts
  useEffect(() => {
    loadUserProfile();
  }, []);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = () => {
    setRefreshing(true);
    loadUserProfile();
  };

  /**
   * Handle username edit - show input field
   */
  const handleEditUsername = () => {
    setNewUsername(userData?.user_username || "");
    setIsEditingUsername(true);
  };

  /**
   * Cancel username edit
   */
  const handleCancelEdit = () => {
    setIsEditingUsername(false);
    setNewUsername("");
  };

  /**
   * Save the new username to Supabase
   */
  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    if (!userData) {
      Alert.alert("Error", "User data not loaded");
      return;
    }

    try {
      setIsSaving(true);

      // Try to update the existing user record
      const { error: updateError, count } = await supabase
        .from("User")
        .update({ user_username: newUsername.trim() })
        .eq("user_id", userData.user_id);

      if (updateError) {
        console.error("Error updating username:", updateError);
        Alert.alert("Error", "Failed to update username");
        return;
      }

      // If no rows were updated, try inserting a new user record
      if (count === 0) {
        const { error: insertError } = await supabase.from("User").insert({
          user_id: userData.user_id,
          user_username: newUsername.trim(),
          user_first: userData.user_first,
          user_last: userData.user_last,
          user_email: userData.user_email,
        });

        if (insertError) {
          console.error("Error inserting user record:", insertError);
          Alert.alert("Error", "Failed to create user record");
          return;
        }
      }

      // Update local state
      setUserData({
        ...userData,
        user_username: newUsername.trim(),
      });

      setIsEditingUsername(false);
      setNewUsername("");
      Alert.alert("Success", "Username updated successfully");

      // Reload profile to confirm changes persisted
      await loadUserProfile();
    } catch (err) {
      console.error("Exception updating username:", err);
      Alert.alert("Error", "An error occurred while updating username");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    const executeLogout = async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          Alert.alert("Error", "Failed to logout: " + error.message);
          return;
        }
        router.replace("/");
      } catch (err) {
        Alert.alert("Error", "An unexpected error occurred");
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (confirmed) {
        executeLogout();
      }
      return;
    }

    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: executeLogout,
      },
    ]);
  };

  // Loading state
  if (loading) {
    return <StateView type="loading" />;
  }

  // Error state
  if (error || !userData) {
    return (
      <View style={styles.container}>
        <StateView type="error" message={error} onRetry={loadUserProfile} />
      </View>
    );
  }

  // Success state
  const statItems = [
    { label: "Followers", value: stats.followers_count },
    { label: "Following", value: stats.following_count },
    { label: "Album Reviews", value: stats.album_reviews_count },
    { label: "Song Reviews", value: stats.song_reviews_count },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Profile Header */}
      <ProfileHeader
        username={userData.user_username}
        firstName={userData.user_first}
        lastName={userData.user_last}
        email={userData.user_email}
      />

      {/* Username Edit Section */}
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

      {/* Stats Grid */}
      <StatGrid stats={statItems} />

      {/* Logout Button */}
      <LogoutButton onLogout={handleLogout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
});