import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLedger, LedgerNotFoundError } from "./_lib/storage.js";
import { resolveSlug } from "./_lib/access.js";
import { issueUnlockToken, pinMatches } from "./_lib/pin.js";
import { clearFailures, rateLimited, recordFailure } from "./_lib/adminAuth.js";
import type { UnlockRequest } from "../shared/types.js";

/**
 * Trades an event's PIN for a signed unlock token this device then sends with
 * every request. Shares the admin brute-force brake — a 4-digit code needs one
 * far more than a 24-character slug does.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metoda niedozwolona" });
    return;
  }

  if (rateLimited(req)) {
    res.status(429).json({ error: "Zbyt wiele prób. Spróbuj ponownie za kilkanaście minut." });
    return;
  }

  let body: UnlockRequest;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Nieprawidłowe dane żądania" });
    return;
  }

  const slug = resolveSlug(body?.slug);
  if (!slug) {
    res.status(404).json({ error: "Nie znaleziono grupy — sprawdź link" });
    return;
  }

  try {
    const ledger = await getLedger(slug);
    if (ledger.archivedAt) {
      res.status(404).json({ error: "To wydarzenie zostało usunięte" });
      return;
    }
    if (!ledger.pin) {
      res.status(400).json({ error: "To wydarzenie nie ma kodu PIN" });
      return;
    }
    if (!pinMatches(body?.pin, ledger.pin)) {
      recordFailure(req);
      res.status(401).json({ error: "Nieprawidłowy PIN" });
      return;
    }

    clearFailures(req);
    res.status(200).json({ token: issueUnlockToken(slug, ledger.pin) });
  } catch (err) {
    if (err instanceof LedgerNotFoundError) {
      res.status(404).json({ error: "Nie znaleziono grupy — sprawdź link" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Nie udało się odblokować wydarzenia" });
  }
}
