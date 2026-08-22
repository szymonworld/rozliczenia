import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLedger, LedgerNotFoundError } from "./_lib/storage.js";
import { resolveSlug } from "./_lib/access.js";
import { unlockTokenValid, withoutPinSecrets } from "./_lib/pin.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Metoda niedozwolona" });
    return;
  }

  const slug = resolveSlug(req.query.slug);
  if (!slug) {
    res.status(404).json({ error: "Nie znaleziono grupy — sprawdź link" });
    return;
  }

  try {
    const ledger = await getLedger(slug);
    // Archived events are still in storage, but the link is dead until an
    // admin restores them.
    if (ledger.archivedAt) {
      res.status(404).json({ error: "To wydarzenie zostało usunięte" });
      return;
    }
    if (ledger.pin) {
      const token = req.headers["x-group-unlock"];
      const supplied = Array.isArray(token) ? token[0] : token;
      if (!unlockTokenValid(supplied, slug, ledger.pin)) {
        res.status(401).json({ error: "To wydarzenie jest zabezpieczone PIN-em", pinRequired: true });
        return;
      }
    }
    res.status(200).json(withoutPinSecrets(ledger));
  } catch (err) {
    if (err instanceof LedgerNotFoundError) {
      res.status(404).json({ error: "Nie znaleziono grupy — sprawdź link" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Nie udało się pobrać danych" });
  }
}
