import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Button, TextInput, View } from "react-native";

export default function SignupScreen() {
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [confirmPassword, setConfirmPassword] = useState(""); 
  const [username, setUsername] = useState(""); 
  const [first, setFirst] = useState(""); 
  const [last, setLast] = useState(""); 
  const [loading, setLoading] = useState(false); // track loading state for signup process

  const router = useRouter();

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !username || !first || !last) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match"); // show error if passwords don't match
      return;
    }

    setLoading(true); // start loading

    try {
      // check if username already exists
      const { data: existingUser, error: existingUserError } = await supabase
        .from("User")
        .select('user_id')
        .eq('user_username', username)
        .maybeSingle();
      
      if (existingUserError) {
        Alert.alert("Error", existingUserError.message);
        setLoading(false);
        return;
      }

      if (existingUser) {
        Alert.alert("Error", "Username already taken");
        setLoading(false);
        return;
      }

      // create new user with email and password
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      console.log(data, signUpError);
      
      if (signUpError || !data.user) {
        Alert.alert(signUpError?.message || "Signup failed")
        setLoading(false)
        return; 
      }

      const userId = data.user.id;

      // insert additional user info into User table
      const { error: insertError } = await supabase
        .from("User")
        .insert({
          user_id: userId,
          user_username: username,
          user_first: first,
          user_last: last,
          user_email: email,
        });

      if (insertError) {
        Alert.alert(insertError.message || "Failed to save user info");
        setLoading(false);
        return;
      }

      Alert.alert("Account created! Please check your email to confirm your account.");
      router.push('/login'); // redirect to login screen after successful signup
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false); // end loading
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
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="First Name"
        value={first}
        onChangeText={setFirst}
      />
      <TextInput
        placeholder="Last Name"
        value={last}
        onChangeText={setLast}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <Button title={loading ? "Creating Account..." : "Sign Up"} onPress={handleSignup} disabled={loading} />
      <Button title="Already have an account? Log In" onPress={() => router.push('/login')} />
    </View>
  );
}