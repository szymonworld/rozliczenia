import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Ledger } from "../../shared/types";
import {
  ApiError,
  GroupNotFoundError,
  PinRequiredError,
  fetchLedger,
  getGroupSlug,
  readCachedLedger,
  reconcilePending,
} from "../lib/api";
import { forgetGroup, rememberGroup } from "../lib/groups";
import { groupName } from "../lib/ledgerView";

type LedgerContextValue = {
  ledger: Ledger | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  isOffline: boolean;
  groupNotFound: boolean;
  pinRequired: boolean;
  syncWarning: boolean;
  refetch: () => Promise<void>;
  applyLedger: (ledger: Ledger) => void;
};

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [ledger, setLedger] = useState<Ledger | null>(() => readCachedLedger());
  const [loading, setLoading] = useState(!ledger);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  const [syncWarning, setSyncWarning] = useState(false);
  const [groupNotFound, setGroupNotFound] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const inFlight = useRef(false);

  const applyLedger = useCallback((next: Ledger) => {
    setLedger(next);
    const missing = reconcilePending(next);
    setSyncWarning(missing.length > 0);
  }, []);

  const refetch = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const next = await fetchLedger();
      applyLedger(next);
      // Record it in the device's group list on every successful fetch, so a
      // renamed group updates its label here too.
      const slug = getGroupSlug();
      if (slug) rememberGroup(slug, groupName(next));
      setError(null);
      setIsOffline(false);
      setGroupNotFound(false);
      setPinRequired(false);
    } catch (err) {
      if (err instanceof PinRequiredError) {
        setPinRequired(true);
      } else if (err instanceof GroupNotFoundError) {
        const dead = getGroupSlug();
        if (dead) forgetGroup(dead);
        setGroupNotFound(true);
      } else if (err instanceof ApiError || !navigator.onLine) {
        setIsOffline(true);
      } else {
        setError(err instanceof Error ? err.message : "Nieznany błąd");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      inFlight.current = false;
    }
  }, [applyLedger]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };
    const onOnline = () => refetch();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", () => setIsOffline(true));
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [refetch]);

  return (
    <LedgerContext.Provider
      value={{
        ledger,
        loading,
        refreshing,
        error,
        isOffline,
        groupNotFound,
        pinRequired,
        syncWarning,
        refetch,
        applyLedger,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
}

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger musi być użyte wewnątrz LedgerProvider");
  return ctx;
}
