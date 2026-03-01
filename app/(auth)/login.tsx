import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Button, TextInput, View } from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState(""); // state to hold email input
  const [password, setPassword] = useState(""); // state to hold password input
  
  const router = useRouter(); 

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password }); // attempt to sign in with email and password

    if (error) {
    Alert.alert("Login Error", error.message); // show error if login fails
    } else {
      router.replace('/'); // redirect to home screen on successful login
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
      <Button title="Don't have an account? Sign Up" onPress={() => router.push('/signup')} />
      
    </View>
  );
}
    

    
