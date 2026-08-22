import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { setGroupSlug } from "../lib/api";

/**
 * Landing point for the secret link, /g/{slug}. Remembers the slug on this
 * device and drops the user into the app, so the secret only has to be opened
 * once per phone.
 */
export function JoinGroup() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (slug) {
      setGroupSlug(slug);
      // Hard reload rather than a route change: identity is per group and is
      // read once when the provider mounts.
      window.location.replace("/");
      return;
    }
    navigate("/", { replace: true });
  }, [slug, navigate]);

  return (
    <div className="app-shell items-center justify-center bg-bg text-sm text-muted">
      Otwieranie grupy…
    </div>
  );
}
