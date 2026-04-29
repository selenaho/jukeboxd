import { createClient, processLock } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const isBrowser = typeof window !== "undefined";

const getAuthConfig = () => {
  if (!isBrowser) {
    // During static export (Node.js), don't use storage
    return {};
  }

  return {
    storage: {
      getItem: (key: string) => {
        try {
          return Promise.resolve(localStorage?.getItem(key) || null);
        } catch {
          return Promise.resolve(null);
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage?.setItem(key, value);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage?.removeItem(key);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: processLock,
  };
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: getAuthConfig(),
  },
);
