import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

/**
 * Root index route - Entry point for the app
 * 
 * This component is the default route when visiting the root path.
 * Since all routing logic is handled in _layout.tsx based on auth state,
 * this component doesn't need to render anything - it just ensures
 * the route exists for Expo Router to match.
 * 
 * The actual navigation happens in _layout.tsx useEffect hooks.
 */
export default function RootIndex() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // This effect is a safety net to ensure we never stay on the root index route
    // The main routing logic in _layout.tsx should handle this, but this acts as a fallback
    if (segments.length === 0 || segments[0] === "") {
      // Don't do anything here - let _layout.tsx handle the routing
      // This just ensures the route component exists
    }
  }, [segments]);

  // Return null or a loading indicator - the user should never see this
  // because _layout.tsx should navigate them away immediately
  return null;
}
