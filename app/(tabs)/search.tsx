import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Tab = "All" | "Song" | "Album" | "Artist" | "Users";

type Item = {
  id: string;
  title: string;
  type: Tab;
};

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async (query: string, tab: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const results: Item[] = [];

      const shouldFetch = (type: Tab) => tab === "All" || tab === type;

      if (shouldFetch("Song")) {
        const { data, error } = await supabase
          .from("Song")
          .select("song_id, song_title")
          .ilike("song_title", `%${query}%`);
        if (error) throw error;
        (data || []).forEach((row) =>
          results.push({
            id: row.song_id,
            title: row.song_title,
            type: "Song",
          }),
        );
      }

      if (shouldFetch("Album")) {
        const { data, error } = await supabase
          .from("Album")
          .select("album_id, album_name")
          .ilike("album_name", `%${query}%`);
        if (error) throw error;
        (data || []).forEach((row) =>
          results.push({
            id: row.album_id,
            title: row.album_name,
            type: "Album",
          }),
        );
      }

      if (shouldFetch("Artist")) {
        const { data, error } = await supabase
          .from("Artist")
          .select("artist_id, artist_name")
          .ilike("artist_name", `%${query}%`);
        if (error) throw error;
        (data || []).forEach((row) =>
          results.push({
            id: row.artist_id,
            title: row.artist_name,
            type: "Artist",
          }),
        );
      }

      if (shouldFetch("Users")) {
        const { data, error } = await supabase
          .from("User")
          .select("user_id, user_username")
          .ilike("user_username", `%${query}%`);
        if (error) throw error;
        (data || []).forEach((row) =>
          results.push({
            id: row.user_id,
            title: row.user_username,
            type: "Users",
          }),
        );
      }

      setItems(results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems(searchQuery, activeTab);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleItemPress = (item: Item) => {
    router.push({
      pathname: `/detail`,
      params: { id: item.id, type: item.type, title: item.title },
    });
  };

  const TABS: Tab[] = ["All", "Song", "Album", "Artist", "Users"];

  const typeColors: Record<Tab, string> = {
    All: "#888",
    Song: "#1DB954",
    Album: "#1E90FF",
    Artist: "#FF6B6B",
    Users: "#8B5CF6",
  };

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.itemLeft}>
        <View
          style={[styles.typeBadge, { backgroundColor: typeColors[item.type] }]}
        >
          <Text style={styles.typeBadgeText}>{item.type}</Text>
        </View>
        <Text style={styles.itemName}>{item.title}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search for songs, albums, or artists..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#1DB954"
          style={{ marginTop: 40 }}
        />
      ) : error ? (
        <Text style={styles.errorText}>Error: {error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>
          {searchQuery ? "No results found." : "Start typing to search."}
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  searchBar: {
    height: 44,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 20,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  tabRow: { flexDirection: "row", marginBottom: 16, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  tabText: { fontSize: 13, color: "#555", fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  itemName: { fontSize: 15, color: "#222", flex: 1 },
  chevron: { fontSize: 22, color: "#ccc", marginLeft: 8 },
  errorText: { color: "red", textAlign: "center", marginTop: 20 },
  emptyText: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },
});
