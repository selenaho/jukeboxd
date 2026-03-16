import { supabase } from "@/utils/supabase";
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native"; // so we can show loading spinner while checking auth status

// Configure linking for GitHub Pages subdirectory deployment
const linking = {
  prefixes: [
    "jukeboxd://",
    "https://selenaho.github.io/jukeboxd",
    "https://selenaho.github.io/jukeboxd/",
  ],
  config: {
    screens: {
      "(auth)": {
        screens: {
          login: "login",
          signup: "signup",
        },
      },
      "(tabs)": {
        screens: {
          index: "",
          detail: "detail",
          profile: "profile",
          search: "search",
          user_detail: "user_detail",
          your_lists: "your_lists",
        },
      },
    },
  },
};

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null); // store current session, null if not logged in
  const router = useRouter();
  const segments = useSegments(); // gives us the current path segments as an array

  const [loading, setLoading] = useState(true); // track if we're still checking auth status

  useEffect(() => {
    // check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); // set session state
      setLoading(false); // because we're done checking auth status
    });

    // listen for auth changes (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session); // update session state on auth change
      },
    );

    return () => {
      authListener.subscription.unsubscribe(); // clean up listener on unmount
    };
  }, []);

  useEffect(() => {
    if (loading) return; // if we're still checking auth status, do nothing

    const isAuthRoute = segments[0] === "(auth)"; // check if current route is an auth route

    if (!session && !isAuthRoute) {
      // if not logged in and not on an auth route, redirect to login
      router.push("/login");
    } else if (session && isAuthRoute) {
      // if logged in and on an auth route, redirect to home
      router.push("/");
    }
  }, [session, segments, loading]); // run this effect whenever session or route segments change

  if (loading) {
    // show loading spinner while checking auth status
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} linking={linking} />;
}
