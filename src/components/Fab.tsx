import { useNavigate } from "react-router-dom";

export function Fab() {
  const navigate = useNavigate();
  return (
    <button
      aria-label="Dodaj wydatek"
      onClick={() => navigate("/dodaj")}
      style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      className="fixed right-5 z-20 flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-3xl font-light text-white shadow-lg shadow-teal-900/30 active:bg-teal-700 dark:bg-teal-500 dark:active:bg-teal-600"
    >
      +
    </button>
  );
}
