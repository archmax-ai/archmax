import { useState, useCallback } from "react";

// Retained across the product rename so users who already acknowledged the disclaimer are not shown it again.
const STORAGE_KEY = "archmax:disclaimer-accepted";

export function useDisclaimerAccepted() {
  const [accepted, setAccepted] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true",
  );

  const accept = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setAccepted(true);
  }, []);

  return { accepted, accept } as const;
}
