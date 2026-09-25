"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseDeepLinkOptions<T> {
  /** The hash prefix to match (e.g., "donor", "entity", "country", "sdg") */
  hashPrefix: string;
  /** The section ID to scroll to */
  sectionId: string;
  /** Transform the hash value (default: identity function) */
  transform?: (value: string) => T;
  /** Callback when hash changes to a different type (for closing sidebars) */
  onNavigateAway?: () => void;
}

/** Navigate to a sidebar by updating the URL hash (adds history entry) */
export function navigateToSidebar(type: string, value: string | number) {
  window.history.pushState(
    null,
    "",
    `#${type}=${encodeURIComponent(String(value))}`,
  );
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/** Update URL to sidebar without adding history entry (for initial opens from charts) */
export function replaceToSidebar(type: string, value: string | number) {
  window.history.replaceState(
    null,
    "",
    `#${type}=${encodeURIComponent(String(value))}`,
  );
}

/** Clear the sidebar hash from URL without adding history entry */
export function clearSidebarHash() {
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
}

/**
 * Hook for handling deep links with hash-based routing.
 * Parses URL hash, sets pending value, and scrolls to section.
 * Listens for hashchange and popstate events to handle runtime navigation.
 *
 * @returns The pending deep link value (or null if none)
 */
export function useDeepLink<T = string>({
  hashPrefix,
  sectionId,
  transform,
  onNavigateAway,
}: UseDeepLinkOptions<T>): [T | null, (value: T | null) => void] {
  const [pendingDeepLink, setPendingDeepLink] = useState<T | null>(null);

  // Use ref to avoid recreating processHash when callback changes
  const onNavigateAwayRef = useRef(onNavigateAway);
  useEffect(() => {
    onNavigateAwayRef.current = onNavigateAway;
  }, [onNavigateAway]);

  const processHash = useCallback(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const prefix = `#${hashPrefix}=`;

    if (hash.startsWith(prefix)) {
      const rawValue = decodeURIComponent(hash.replace(prefix, ""));
      const value = transform
        ? transform(rawValue)
        : (rawValue as unknown as T);
      if (value !== null && value !== undefined && !Number.isNaN(value)) {
        setPendingDeepLink(value);
        // Delay scroll to allow any closing sidebars to restore overflow first
        setTimeout(() => {
          document
            .getElementById(sectionId)
            ?.scrollIntoView({ behavior: "smooth" });
        }, 350);
      }
    } else {
      setPendingDeepLink(null);
      // Hash changed to different type - close this component's sidebar
      onNavigateAwayRef.current?.();
    }
  }, [hashPrefix, sectionId, transform]);

  // Process hash on mount
  useEffect(() => {
    const frame = requestAnimationFrame(processHash);
    return () => cancelAnimationFrame(frame);
  }, [processHash]);

  // Listen for hash changes and browser navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleChange = () => processHash();
    window.addEventListener("hashchange", handleChange);
    window.addEventListener("popstate", handleChange);
    return () => {
      window.removeEventListener("hashchange", handleChange);
      window.removeEventListener("popstate", handleChange);
    };
  }, [processHash]);

  return [pendingDeepLink, setPendingDeepLink];
}
