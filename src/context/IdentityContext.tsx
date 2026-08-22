import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { getGroupSlug } from "../lib/api";

const LEGACY_KEY = "rozliczenia:who-am-i";

/**
 * Identity is per group. It used to be one global key, which meant switching
 * groups carried the old member id across: the gate saw a value and let you
 * through, then rendered the balance of someone who does not exist in the
 * group you just opened.
 */
function storageKey(slug: string | null): string | null {
  return slug ? `${LEGACY_KEY}:${slug}` : null;
}

function readIdentity(): string | null {
  const key = storageKey(getGroupSlug());
  if (!key) return null;
  try {
    const scoped = localStorage.getItem(key);
    if (scoped) return scoped;

    // One-time migration: a device that only ever knew one group has its id
    // under the old global key. Claim it for the current group, then retire it
    // so a later group switch cannot pick it up again.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      localStorage.setItem(key, legacy);
      localStorage.removeItem(LEGACY_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

type IdentityContextValue = {
  whoAmI: string | null;
  setWhoAmI: (memberId: string) => void;
  clearWhoAmI: () => void;
};

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [whoAmI, setWhoAmIState] = useState<string | null>(readIdentity);

  const setWhoAmI = useCallback((memberId: string) => {
    setWhoAmIState(memberId);
    const key = storageKey(getGroupSlug());
    if (!key) return;
    try {
      localStorage.setItem(key, memberId);
    } catch {
      // ignore
    }
  }, []);

  const clearWhoAmI = useCallback(() => {
    setWhoAmIState(null);
    const key = storageKey(getGroupSlug());
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, []);

  return (
    <IdentityContext.Provider value={{ whoAmI, setWhoAmI, clearWhoAmI }}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error("useIdentity musi być użyte wewnątrz IdentityProvider");
  return ctx;
}
