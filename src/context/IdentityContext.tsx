import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "rozliczenia:who-am-i";

type IdentityContextValue = {
  whoAmI: string | null;
  setWhoAmI: (memberId: string) => void;
  clearWhoAmI: () => void;
};

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [whoAmI, setWhoAmIState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setWhoAmI = useCallback((memberId: string) => {
    setWhoAmIState(memberId);
    try {
      localStorage.setItem(STORAGE_KEY, memberId);
    } catch {
      // ignore
    }
  }, []);

  const clearWhoAmI = useCallback(() => {
    setWhoAmIState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
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
