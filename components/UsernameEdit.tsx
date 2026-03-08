import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface UsernameEditProps {
  username: string;
  isEditing: boolean;
  newUsername: string;
  isSaving: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  onUsernameChange: (text: string) => void;
  onSave: () => void;
}

export default function UsernameEdit({
  username,
  isEditing,
  newUsername,
  isSaving,
  onEditStart,
  onEditCancel,
  onUsernameChange,
  onSave,
}: UsernameEditProps) {
  if (isEditing) {
    return (
      <View style={styles.editContainer}>
        <Text style={styles.label}>Edit Username</Text>
        <TextInput
          value={newUsername}
          onChangeText={onUsernameChange}
          placeholder="Enter new username"
          placeholderTextColor="#d1d5db"
          editable={!isSaving}
          style={styles.input}
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Save</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onEditCancel}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.viewContainer}>
      <View style={styles.usernameRow}>
        <Text style={styles.displayUsername}>{username}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={onEditStart}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="pencil" size={18} color="#6366f1" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  displayUsername: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },
  editButton: {
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  editContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
    marginBottom: 12,
    backgroundColor: "#f9fafb",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#6366f1",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  cancelButtonText: {
    color: "#6b7280",
    fontWeight: "600",
    fontSize: 14,
  },
});
