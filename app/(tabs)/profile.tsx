import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { Alert, Button, Text, View } from "react-native";

export default function Profile() {
  // logout button for testing auth state changes
  const router = useRouter();
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      Alert.alert("Error logging out", error.message)
      return
    }

    router.replace('/')
  };
  
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Dummy Text 123</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}
