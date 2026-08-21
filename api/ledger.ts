import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLedger } from "./_lib/storage.js";
import { GROUP_SLUG } from "../shared/types.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Metoda niedozwolona" });
    return;
  }
  try {
    const ledger = await getLedger(GROUP_SLUG);
    res.status(200).json(ledger);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Nie udało się pobrać danych" });
  }
}
