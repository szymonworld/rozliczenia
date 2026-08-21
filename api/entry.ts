import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLedger, saveLedger } from "./_lib/storage.js";
import { GROUP_SLUG } from "../shared/types.js";
import type { Entry, EntryWriteRequest, Ledger } from "../shared/types.js";

function validateEntry(entry: Entry): string | null {
  if (entry.type === "expense") {
    if (!entry.description || !entry.description.trim()) return "Opis jest wymagany";
    if (!Number.isInteger(entry.amountGrosze) || entry.amountGrosze <= 0)
      return "Kwota musi być dodatnia";
    if (!entry.payerId) return "Płacący jest wymagany";
    if (!entry.shares || entry.shares.length === 0) return "Wymagany jest co najmniej jeden uczestnik";
    const sum = entry.shares.reduce((s, sh) => s + sh.amountGrosze, 0);
    if (sum !== entry.amountGrosze) return "Suma udziałów musi być równa kwocie";
  } else if (entry.type === "settlement") {
    if (!entry.fromId || !entry.toId) return "Wymagane są obie strony rozliczenia";
    if (entry.fromId === entry.toId) return "Strony rozliczenia muszą być różne";
    if (!Number.isInteger(entry.amountGrosze) || entry.amountGrosze <= 0)
      return "Kwota musi być dodatnia";
  } else {
    return "Nieznany typ wpisu";
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metoda niedozwolona" });
    return;
  }

  let body: EntryWriteRequest;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Nieprawidłowe dane żądania" });
    return;
  }

  if (!body || typeof body !== "object" || !("action" in body)) {
    res.status(400).json({ error: "Nieprawidłowe dane żądania" });
    return;
  }

  try {
    const ledger = await getLedger(GROUP_SLUG);
    let updated: Ledger;

    switch (body.action) {
      case "create": {
        const err = validateEntry(body.entry);
        if (err) {
          res.status(400).json({ error: err });
          return;
        }
        updated = { ...ledger, entries: [...ledger.entries, body.entry] };
        break;
      }
      case "update": {
        const idx = ledger.entries.findIndex((e) => e.id === body.id);
        if (idx === -1) {
          res.status(404).json({ error: "Nie znaleziono wpisu" });
          return;
        }
        const existing = ledger.entries[idx];
        const previousValue = { ...existing } as Partial<Entry>;
        delete (previousValue as { previousValue?: unknown }).previousValue;
        const merged = {
          ...existing,
          ...body.changes,
          editedAt: new Date().toISOString(),
          editedBy: body.editedBy,
          previousValue,
        } as Entry;
        const err = validateEntry(merged);
        if (err) {
          res.status(400).json({ error: err });
          return;
        }
        const entries = [...ledger.entries];
        entries[idx] = merged;
        updated = { ...ledger, entries };
        break;
      }
      case "delete": {
        const idx = ledger.entries.findIndex((e) => e.id === body.id);
        if (idx === -1) {
          res.status(404).json({ error: "Nie znaleziono wpisu" });
          return;
        }
        const entries = [...ledger.entries];
        entries[idx] = { ...entries[idx], deletedAt: new Date().toISOString() };
        updated = { ...ledger, entries };
        break;
      }
      case "restore": {
        const idx = ledger.entries.findIndex((e) => e.id === body.id);
        if (idx === -1) {
          res.status(404).json({ error: "Nie znaleziono wpisu" });
          return;
        }
        const entries = [...ledger.entries];
        const { deletedAt: _deletedAt, ...rest } = entries[idx];
        entries[idx] = rest as Entry;
        updated = { ...ledger, entries };
        break;
      }
      case "addMember": {
        const name = body.name?.trim();
        if (!name) {
          res.status(400).json({ error: "Imię jest wymagane" });
          return;
        }
        const slugBase = name
          .toLowerCase()
          .normalize("NFD")
          .split("")
          .filter((ch) => ch.charCodeAt(0) < 128)
          .join("")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        const id = slugBase || `osoba-${Date.now()}`;
        let uniqueId = id;
        let n = 1;
        while (ledger.members.some((m) => m.id === uniqueId)) {
          uniqueId = `${id}-${n++}`;
        }
        updated = { ...ledger, members: [...ledger.members, { id: uniqueId, name }] };
        break;
      }
      case "setMemberHidden": {
        const members = ledger.members.map((m) =>
          m.id === body.memberId ? { ...m, hidden: body.hidden } : m,
        );
        updated = { ...ledger, members };
        break;
      }
      case "confirmSettlement":
      case "rejectSettlement": {
        const idx = ledger.entries.findIndex((e) => e.id === body.id);
        if (idx === -1) {
          res.status(404).json({ error: "Nie znaleziono wpisu" });
          return;
        }
        const target = ledger.entries[idx];
        if (target.type !== "settlement") {
          res.status(400).json({ error: "Tylko rozliczenie można potwierdzić" });
          return;
        }
        // Only the person who was supposed to receive the money can rule on it.
        if (target.toId !== body.memberId) {
          res.status(403).json({ error: "Tylko odbiorca może potwierdzić przelew" });
          return;
        }
        const now = new Date().toISOString();
        const entries = [...ledger.entries];
        entries[idx] =
          body.action === "confirmSettlement"
            ? {
                ...target,
                confirmedAt: now,
                confirmedBy: body.memberId,
                rejectedAt: undefined,
                rejectedBy: undefined,
              }
            : {
                ...target,
                rejectedAt: now,
                rejectedBy: body.memberId,
                confirmedAt: undefined,
                confirmedBy: undefined,
              };
        updated = { ...ledger, entries };
        break;
      }
      case "setSettings": {
        updated = {
          ...ledger,
          settings: { ...ledger.settings, ...body.settings },
        };
        break;
      }
      case "setMemberPayment": {
        if (!ledger.members.some((m) => m.id === body.memberId)) {
          res.status(404).json({ error: "Nie znaleziono osoby" });
          return;
        }
        const blik = body.payment?.blik?.trim();
        const iban = body.payment?.iban?.trim();
        const members = ledger.members.map((m) =>
          m.id === body.memberId
            ? {
                ...m,
                payment: {
                  ...(blik ? { blik } : {}),
                  ...(iban ? { iban } : {}),
                },
              }
            : m,
        );
        updated = { ...ledger, members };
        break;
      }
      case "renameMember": {
        const name = body.name?.trim();
        if (!name) {
          res.status(400).json({ error: "Imię jest wymagane" });
          return;
        }
        if (!ledger.members.some((m) => m.id === body.memberId)) {
          res.status(404).json({ error: "Nie znaleziono osoby" });
          return;
        }
        // Only the display name changes — ids stay put so history keeps resolving.
        const members = ledger.members.map((m) =>
          m.id === body.memberId ? { ...m, name } : m,
        );
        updated = { ...ledger, members };
        break;
      }
      default:
        res.status(400).json({ error: "Nieznana akcja" });
        return;
    }

    await saveLedger(updated);
    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Nie udało się zapisać danych" });
  }
}
