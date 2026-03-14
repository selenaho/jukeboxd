import { supabase } from "@/utils/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

type RelatedItem = {
  id: string;
  title: string;
  type: "Song" | "Album" | "Artist";
};

type DetailData = {
  title: string;
  type: string;
  related: RelatedItem[];
};

type FilterTab = "All" | "Song" | "Album" | "Artist";

export default function DetailScreen() {
  const { id, type, title } = useLocalSearchParams<{
    id: string;
    type: string;
    title: string;
  }>();
  const router = useRouter();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  useEffect(() => {
    setActiveTab("All");
    fetchDetail();
  }, [id, type]);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const related: RelatedItem[] = [];

      if (type === "Song") {
        const { data: row, error } = await supabase
          .from("Song")
          .select(`
            song_id,
            song_title,
            SongAlbum ( Album ( album_id, album_name ) ),
            SongArtist ( Artist ( artist_id, artist_name ) )
          `)
          .eq("song_id", id)
          .single();
        if (error) throw error;

        row.SongArtist?.forEach((s: any) => {
          if (s.Artist) related.push({ id: s.Artist.artist_id, title: s.Artist.artist_name, type: "Artist" });
        });
        row.SongAlbum?.forEach((s: any) => {
          if (s.Album) related.push({ id: s.Album.album_id, title: s.Album.album_name, type: "Album" });
        });
        setData({ title: row.song_title, type: "Song", related });

      } else if (type === "Album") {
        const { data: row, error } = await supabase
          .from("Album")
          .select(`
            album_id,
            album_name,
            AlbumArtist ( Artist ( artist_id, artist_name ) ),
            SongAlbum ( Song ( song_id, song_title ) )
          `)
          .eq("album_id", id)
          .single();
        if (error) throw error;

        row.AlbumArtist?.forEach((a: any) => {
          if (a.Artist) related.push({ id: a.Artist.artist_id, title: a.Artist.artist_name, type: "Artist" });
        });
        row.SongAlbum?.forEach((s: any) => {
          if (s.Song) related.push({ id: s.Song.song_id, title: s.Song.song_title, type: "Song" });
        });
        setData({ title: row.album_name, type: "Album", related });

      } else if (type === "Artist") {
        const { data: row, error } = await supabase
          .from("Artist")
          .select(`
            artist_id,
            artist_name,
            SongArtist ( Song ( song_id, song_title ) ),
            AlbumArtist ( Album ( album_id, album_name ) )
          `)
          .eq("artist_id", id)
          .single();
        if (error) throw error;

        row.SongArtist?.forEach((s: any) => {
          if (s.Song) related.push({ id: s.Song.song_id, title: s.Song.song_title, type: "Song" });
        });
        row.AlbumArtist?.forEach((a: any) => {
          if (a.Album) related.push({ id: a.Album.album_id, title: a.Album.album_name, type: "Album" });
        });
        setData({ title: row.artist_name, type: "Artist", related });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRelatedPress = (item: RelatedItem) => {
    router.push({
      pathname: "/detail",
      params: { id: item.id, type: item.type, title: item.title },
    });
  };

  const typeColors: Record<string, string> = {
    Song: "#1DB954",
    Album: "#1E90FF",
    Artist: "#FF6B6B",
  };

  // Determine which tabs are relevant based on what related items exist
  const availableTypes = Array.from(new Set(data?.related.map((r) => r.type) || []));
  const tabs: FilterTab[] = ["All", ...availableTypes.sort() as FilterTab[]];

  const filteredRelated =
    activeTab === "All"
      ? data?.related || []
      : data?.related.filter((r) => r.type === activeTab) || [];

  const renderRelatedItem = ({ item }: { item: RelatedItem }) => (
    <TouchableOpacity
      style={styles.sectionItem}
      onPress={() => handleRelatedPress(item)}
    >
      <View style={[styles.itemBadge, { backgroundColor: typeColors[item.type] }]}>
        <Text style={styles.itemBadgeText}>{item.type}</Text>
      </View>
      <Text style={styles.sectionItemText}>{item.title}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Fixed header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        {loading ? null : data ? (
          <>
            <View style={[styles.typeBadge, { backgroundColor: typeColors[data.type] }]}>
              <Text style={styles.typeBadgeText}>{data.type}</Text>
            </View>
            <Text style={styles.title}>{data.title}</Text>

            {/* Tabs — only show if there are related items */}
            {tabs.length > 1 && (
              <View style={styles.tabRow}>
                {tabs.map((tab) => (
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
            )}
          </>
        ) : null}
      </View>

      {/* Scrollable content */}
      {loading ? (
        <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>Error: {error}</Text>
      ) : filteredRelated.length === 0 ? (
        <Text style={styles.emptyText}>No {activeTab === "All" ? "related items" : activeTab.toLowerCase() + "s"} found.</Text>
      ) : (
        <FlatList
          data={filteredRelated}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderRelatedItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 17, color: "#1DB954" },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  typeBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  title: { fontSize: 26, fontWeight: "800", color: "#111", marginBottom: 16 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
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
  listContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  sectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    marginBottom: 6,
  },
  sectionItemText: { fontSize: 15, color: "#222", flex: 1 },
  itemBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
  },
  itemBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  chevron: { fontSize: 20, color: "#ccc" },
  errorText: { color: "red", textAlign: "center", marginTop: 20 },
  emptyText: { color: "#aaa", textAlign: "center", marginTop: 40, fontSize: 15 },
});