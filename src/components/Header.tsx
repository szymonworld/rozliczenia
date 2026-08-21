import { useNavigate } from "react-router-dom";

export function Header({ title, back }: { title: string; back?: boolean }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-neutral-50/90 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="flex items-center gap-2">
        {back && (
          <button
            aria-label="Wstecz"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-neutral-700 active:bg-neutral-200 dark:text-neutral-200 dark:active:bg-neutral-800"
          >
            ←
          </button>
        )}
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</h1>
      </div>
      {!back && (
        <button
          aria-label="Ustawienia"
          onClick={() => navigate("/ustawienia")}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-neutral-700 active:bg-neutral-200 dark:text-neutral-200 dark:active:bg-neutral-800"
        >
          ⚙️
        </button>
      )}
    </header>
  );
}
