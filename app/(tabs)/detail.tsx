import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function DetailScreen() {
  const { id, type, title } = useLocalSearchParams<{
    id: string;
    type: string;
    title: string;
  }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.type}>{type}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.id}>ID: {id}</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 24, backgroundColor: "#fff" },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 17, color: "#1DB954" },
  type: { fontSize: 13, fontWeight: "700", color: "#888", textTransform: "uppercase", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#111", marginBottom: 8 },
  id: { fontSize: 13, color: "#bbb" },
});