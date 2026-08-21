import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { setGroupSlug } from "../lib/api";
import { useLedger } from "../context/LedgerContext";

/**
 * Landing point for the secret link, /g/{slug}. Remembers the slug on this
 * device and drops the user into the app, so the secret only has to be opened
 * once per phone.
 */
export function JoinGroup() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { refetch } = useLedger();

  useEffect(() => {
    if (slug) {
      setGroupSlug(slug);
      void refetch();
    }
    navigate("/", { replace: true });
  }, [slug, navigate, refetch]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-muted">
      Otwieranie grupy…
    </div>
  );
}
