"use client";

import {
  useEffect,
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import { initLytics, getUserProfile, type UserProfile } from "@/lib/lytics";
import { initPersonalize } from "@/lib/personalize";

interface LyticsContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const LyticsContext = createContext<LyticsContextType>({
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
});

export function useLytics() {
  return useContext(LyticsContext);
}

export function LyticsProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const userProfile = await getUserProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    console.log("[LyticsProvider] useEffect started");

    // Initialize Lytics with account ID
    const accountId = process.env.NEXT_PUBLIC_LYTICS_ACCOUNT_ID;
    console.log(
      "[LyticsProvider] Lytics account ID:",
      accountId || "(not set)"
    );
    if (accountId) {
      initLytics(accountId);
    }

    // Initialize Contentstack Personalize Edge SDK (don't await - let it init in background)
    console.log("[LyticsProvider] Initializing Personalize (background)...");
    initPersonalize().catch((err) =>
      console.error("[LyticsProvider] Personalize init error:", err)
    );

    // Wait for Lytics to be ready before fetching profile
    const waitForLytics = () => {
      return new Promise<void>((resolve) => {
        let resolved = false;

        const doResolve = () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        };

        // Method 1: Use jstag.on('ready') if available
        if (window.jstag?.on) {
          console.log("[LyticsProvider] Using jstag.on('ready') callback...");
          window.jstag.on("ready", () => {
            console.log("[LyticsProvider] Lytics ready event fired!");
            doResolve();
          });
        }

        // Method 2: Also check for "Lytics initialized successfully" by polling
        const checkReady = () => {
          // The real getEntity replaces the stub after script loads
          // We can check if getEntity actually returns something useful
          if (window.jstag?.getEntity) {
            console.log("[LyticsProvider] jstag.getEntity exists, testing...");
            try {
              // Try calling getEntity - if it works and calls back, we're ready
              window.jstag.getEntity((entity: unknown) => {
                console.log(
                  "[LyticsProvider] getEntity test succeeded:",
                  entity
                );
                doResolve();
              });
              return; // Don't continue polling if we made the call
            } catch (e) {
              console.log("[LyticsProvider] getEntity test failed:", e);
            }
          }

          console.log("[LyticsProvider] Waiting for Lytics...");
          setTimeout(checkReady, 200);
        };

        // Start checking after a delay to let script load
        setTimeout(checkReady, 500);

        // Timeout after 5 seconds
        setTimeout(() => {
          console.log(
            "[LyticsProvider] Lytics wait timeout, proceeding anyway"
          );
          doResolve();
        }, 5000);
      });
    };

    (async () => {
      // Wait for Lytics to be ready
      await waitForLytics();

      console.log("[LyticsProvider] Loading profile...");
      try {
        await refreshProfile();
        console.log("[LyticsProvider] Profile loaded!");
      } catch (err) {
        console.error("[LyticsProvider] Error loading profile:", err);
      }
      console.log("[LyticsProvider] Setting isLoading to false");
      setIsLoading(false);
    })();
  }, []);

  return (
    <LyticsContext.Provider value={{ profile, isLoading, refreshProfile }}>
      {children}
    </LyticsContext.Provider>
  );
}
