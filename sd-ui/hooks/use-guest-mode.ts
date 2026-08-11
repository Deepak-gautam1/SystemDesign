"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

const KEY = "sd_guest_mode";

/**
 * Tracks whether a signed-out visitor chose "Explore as guest".
 *
 * Signing in clears the flag, so signing out later returns to the welcome
 * screen rather than silently dropping into an unsaved guest session.
 *
 * `ready` guards the first paint: until next-auth resolves the session we
 * don't know whether to show the welcome screen or the app, and flashing the
 * wrong one is worse than a beat of nothing. Read in an effect (not a
 * useState initialiser) because localStorage doesn't exist during prerender.
 */
export function useGuestMode() {
  const { status } = useSession();
  const [isGuest, setIsGuest] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try { setIsGuest(localStorage.getItem(KEY) === "1"); } catch {}
    setLoaded(true);
  }, []);

  // Being signed in supersedes guest mode.
  useEffect(() => {
    if (status !== "authenticated" || !isGuest) return;
    try { localStorage.removeItem(KEY); } catch {}
    setIsGuest(false);
  }, [status, isGuest]);

  const enterGuest = useCallback(() => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setIsGuest(true);
  }, []);

  const exitGuest = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch {}
    setIsGuest(false);
  }, []);

  return {
    isGuest,
    enterGuest,
    exitGuest,
    signedIn: status === "authenticated",
    /** Safe to decide what to render. */
    ready: loaded && status !== "loading",
    /** Neither signed in nor opted into guest — show the welcome screen. */
    needsWelcome: loaded && status === "unauthenticated" && !isGuest,
  };
}
