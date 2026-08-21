import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

export function Header({
  title,
  back,
  right,
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      className="sticky top-0 z-30 border-b border-line/80 bg-bg/75 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-md items-center gap-1 px-2 py-2">
        {back && (
          <button
            aria-label="Wstecz"
            onClick={() => navigate(-1)}
            className="press flex h-11 w-11 items-center justify-center rounded-full text-ink active:bg-surface-2"
          >
            <Icon name="back" />
          </button>
        )}
        <h1
          className={`flex-1 text-[17px] font-semibold tracking-tight text-ink ${back ? "" : "pl-3"}`}
        >
          {title}
        </h1>
        {right ?? (
          <button
            aria-label="Ustawienia"
            onClick={() => navigate("/ustawienia")}
            className="press flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-surface-2"
          >
            <Icon name="settings" />
          </button>
        )}
      </div>
    </header>
  );
}
