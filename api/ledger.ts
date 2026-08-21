import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLedger } from "./_lib/storage.js";
import { resolveSlug } from "./_lib/access.js";

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
    res.status(200).json(ledger);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Nie udało się pobrać danych" });
  }
}
