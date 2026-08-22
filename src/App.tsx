import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { IdentityProvider, useIdentity } from "./context/IdentityContext";
import { LedgerProvider, useLedger } from "./context/LedgerContext";
import { getGroupSlug } from "./lib/api";
import { groupName } from "./lib/ledgerView";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NamePicker } from "./screens/NamePicker";
import { NeedLink } from "./screens/NeedLink";
import { JoinGroup } from "./screens/JoinGroup";
import { Home } from "./screens/Home";
import { History } from "./screens/History";
import { AddEdit } from "./screens/AddEdit";
import { Settings } from "./screens/Settings";
import { Stats } from "./screens/Stats";
import { NewEvent } from "./screens/NewEvent";
import { Admin } from "./screens/Admin";
import { PinLock } from "./screens/PinLock";

/**
 * Requires a valid group link, then the event's PIN if it has one, then an
 * identity on this device — in that order, so a locked event reveals nothing
 * (not even who is in it) before the code is entered.
 */
function Gate({ children }: { children: ReactNode }) {
  const { whoAmI } = useIdentity();
  const { ledger, groupNotFound, pinRequired } = useLedger();

  // No slug at all is refused up front, so a device without the secret link
  // never renders the app — not even briefly from the cache.
  if (!getGroupSlug() || groupNotFound) return <NeedLink />;
  if (pinRequired) return <PinLock />;

  // The stored id has to belong to *this* group. Identity is scoped per slug,
  // but a stale one can still survive a switch — the provider reads storage
  // once at start-up, before the join route has swapped the slug over. Checking
  // membership here makes the gate correct no matter how you arrived.
  const known = !ledger || ledger.members.some((m) => m.id === whoAmI);
  if (!whoAmI || !known) return <NamePicker />;
  return <>{children}</>;
}

function AppRoutes() {
  const { ledger } = useLedger();
  const guard = (element: ReactNode) => <Gate>{element}</Gate>;

  // Keep the browser tab and the install prompt in step with the group name.
  useEffect(() => {
    document.title = groupName(ledger);
  }, [ledger]);

  return (
    <Routes>
      {/* The secret link — stores the slug, then hands over to the app. */}
      <Route path="/g/:slug" element={<JoinGroup />} />
      <Route path="/admin" element={<Admin />} />

      <Route path="/" element={guard(<Home />)} />
      <Route path="/historia" element={guard(<History />)} />
      <Route path="/podsumowanie" element={guard(<Stats />)} />
      <Route path="/dodaj" element={guard(<AddEdit />)} />
      <Route path="/edytuj/:id" element={guard(<AddEdit />)} />
      <Route path="/ustawienia" element={guard(<Settings />)} />
      <Route path="/nowe" element={guard(<NewEvent />)} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <IdentityProvider>
        <LedgerProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </LedgerProvider>
      </IdentityProvider>
    </ThemeProvider>
  );
}
