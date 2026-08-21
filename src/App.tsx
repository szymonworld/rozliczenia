import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { IdentityProvider, useIdentity } from "./context/IdentityContext";
import { LedgerProvider } from "./context/LedgerContext";
import { ToastProvider } from "./context/ToastContext";
import { NamePicker } from "./screens/NamePicker";
import { Home } from "./screens/Home";
import { History } from "./screens/History";
import { AddEdit } from "./screens/AddEdit";
import { Settings } from "./screens/Settings";
import { Stats } from "./screens/Stats";

function Gate({ children }: { children: ReactNode }) {
  const { whoAmI } = useIdentity();
  if (!whoAmI) return <NamePicker />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Gate>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/historia" element={<History />} />
        <Route path="/podsumowanie" element={<Stats />} />
        <Route path="/dodaj" element={<AddEdit />} />
        <Route path="/edytuj/:id" element={<AddEdit />} />
        <Route path="/ustawienia" element={<Settings />} />
      </Routes>
    </Gate>
  );
}

export default function App() {
  return (
    <IdentityProvider>
      <LedgerProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </LedgerProvider>
    </IdentityProvider>
  );
}
