import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type MusicType = "Song" | "Album" | "Artist";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function RequestMusicModal({ visible, onClose }: Props) {
  const [selectedType, setSelectedType] = useState<MusicType>("Song");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [resultMessage, setResultMessage] = useState("");

  const handleClose = () => {
    setName("");
    setSelectedType("Song");
    setResult(null);
    setResultMessage("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/search-spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, name: name.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong");
      setResult("success");
      setResultMessage(`"${data.name}" has been added successfully.`);
    } catch (err: any) {
      setResult("error");
      setResultMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const TYPES: MusicType[] = ["Song", "Album", "Artist"];

  const typeColors: Record<MusicType, string> = {
    Song: "#1DB954",
    Album: "#1E90FF",
    Artist: "#FF6B6B",
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Request missing music</Text>
          <Text style={styles.subtitle}>
            We'll search Spotify and add it to the database.
          </Text>

          {/* Type selector */}
          <View style={styles.typeRow}>
            {TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeBtn,
                  selectedType === type && {
                    backgroundColor: typeColors[type],
                    borderColor: typeColors[type],
                  },
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    selectedType === type && styles.typeBtnTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Name input */}
          <TextInput
            style={styles.input}
            placeholder={`Enter ${selectedType.toLowerCase()} name...`}
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Result message */}
          {result && (
            <Text style={result === "success" ? styles.successText : styles.errorText}>
              {resultMessage}
            </Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!name.trim() || loading) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {result === "success" ? "Add another" : "Submit"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#888", marginBottom: 20 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  typeBtnText: { fontSize: 13, color: "#555", fontWeight: "500" },
  typeBtnTextActive: { color: "#fff", fontWeight: "700" },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
    color: "#222",
  },
  successText: { color: "#1DB954", fontSize: 13, marginBottom: 12, textAlign: "center" },
  errorText: { color: "#ef4444", fontSize: 13, marginBottom: 12, textAlign: "center" },
  buttonRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, color: "#555" },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1DB954",
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#ccc" },
  submitBtnText: { fontSize: 15, color: "#fff", fontWeight: "700" },
});