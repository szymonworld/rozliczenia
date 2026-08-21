import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { IdentityProvider, useIdentity } from "./context/IdentityContext";
import { LedgerProvider, useLedger } from "./context/LedgerContext";
import { getGroupSlug } from "./lib/api";
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

/** Requires a valid group link first, then an identity on this device. */
function Gate({ children }: { children: ReactNode }) {
  const { whoAmI } = useIdentity();
  const { groupNotFound } = useLedger();

  // No slug at all is refused up front, so a device without the secret link
  // never renders the app — not even briefly from the cache.
  if (!getGroupSlug() || groupNotFound) return <NeedLink />;
  if (!whoAmI) return <NamePicker />;
  return <>{children}</>;
}

function AppRoutes() {
  const guard = (element: ReactNode) => <Gate>{element}</Gate>;

  return (
    <Routes>
      {/* The secret link — stores the slug, then hands over to the app. */}
      <Route path="/g/:slug" element={<JoinGroup />} />

      <Route path="/" element={guard(<Home />)} />
      <Route path="/historia" element={guard(<History />)} />
      <Route path="/podsumowanie" element={guard(<Stats />)} />
      <Route path="/dodaj" element={guard(<AddEdit />)} />
      <Route path="/edytuj/:id" element={guard(<AddEdit />)} />
      <Route path="/ustawienia" element={guard(<Settings />)} />
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
