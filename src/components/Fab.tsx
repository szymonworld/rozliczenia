import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

export function Fab() {
  const navigate = useNavigate();
  return (
    <button
      aria-label="Dodaj wydatek"
      onClick={() => navigate("/dodaj")}
      style={{
        bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
        background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
        boxShadow: "var(--shadow-lift)",
      }}
      className="press anim-pop fixed right-5 z-30 flex h-15 w-15 items-center justify-center rounded-full text-on-accent"
    >
      <Icon name="plus" className="h-7 w-7" strokeWidth={2.25} />
    </button>
  );
}
