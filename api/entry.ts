import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLedger, LedgerNotFoundError, saveLedger } from "./_lib/storage.js";
import { resolveSlug } from "./_lib/access.js";
import {
  isValidPinFormat,
  makePinConfig,
  pinMatches,
  unlockTokenValid,
  withoutPinSecrets,
} from "./_lib/pin.js";
import type { Entry, EntryWriteRequest, Ledger } from "../shared/types.js";
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "../shared/types.js";

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

/** Every entry — deleted ones included — that names this member. */
function memberReferences(ledger: Ledger, memberId: string): number {
  return ledger.entries.filter((e) =>
    e.type === "expense"
      ? e.payerId === memberId || e.shares.some((sh) => sh.memberId === memberId)
      : e.fromId === memberId || e.toId === memberId,
  ).length;
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

  const slug = resolveSlug((body as { slug?: unknown }).slug);
  if (!slug) {
    res.status(404).json({ error: "Nie znaleziono grupy — sprawdź link" });
    return;
  }

  try {
    const ledger = await getLedger(slug);
    // An archived event is read-only-and-invisible until restored, so nothing
    // may be written into it — not even another archive.
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
      case "setPin": {
        // Changing an existing PIN requires the old one, so a device that is
        // merely unlocked cannot silently lock everyone else out.
        if (ledger.pin && !pinMatches(body.currentPin, ledger.pin)) {
          res.status(401).json({ error: "Nieprawidłowy obecny PIN" });
          return;
        }
        if (!isValidPinFormat(body.pin)) {
          res.status(400).json({
            error: `PIN musi mieć od ${PIN_MIN_LENGTH} do ${PIN_MAX_LENGTH} cyfr`,
          });
          return;
        }
        updated = { ...ledger, pin: makePinConfig(body.pin) };
        break;
      }
      case "clearPin": {
        if (!ledger.pin) {
          res.status(400).json({ error: "To wydarzenie nie ma kodu PIN" });
          return;
        }
        if (!pinMatches(body.currentPin, ledger.pin)) {
          res.status(401).json({ error: "Nieprawidłowy obecny PIN" });
          return;
        }
        const { pin: _pin, ...rest } = ledger;
        updated = rest;
        break;
      }
      case "archiveGroup": {
        // touch:false so archiving does not reset the idle clock the admin
        // console reports on. Saved here rather than falling through to the
        // shared save at the bottom, which always touches.
        const archived: Ledger = {
          ...ledger,
          archivedAt: new Date().toISOString(),
          archivedBy: body.memberId,
        };
        await saveLedger(archived, { touch: false });
        res.status(200).json(withoutPinSecrets(archived));
        return;
      }
      case "removeMember": {
        const member = ledger.members.find((m) => m.id === body.memberId);
        if (!member) {
          res.status(404).json({ error: "Nie znaleziono osoby" });
          return;
        }
        if (ledger.members.length <= 1) {
          res.status(409).json({ error: "W grupie musi zostać co najmniej jedna osoba" });
          return;
        }
        // Deleted entries can be restored and history still renders them, so
        // any reference at all is enough to block the removal.
        const used = memberReferences(ledger, body.memberId);
        if (used > 0) {
          res.status(409).json({
            error: `${member.name} występuje w ${used} wpisach — zamiast usuwać, ukryj tę osobę`,
          });
          return;
        }
        updated = {
          ...ledger,
          members: ledger.members.filter((m) => m.id !== body.memberId),
        };
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
        const settings = { ...ledger.settings, ...body.settings };
        if (settings.groupName !== undefined) {
          const name = settings.groupName.trim().slice(0, 60);
          if (name) settings.groupName = name;
          else delete settings.groupName;
        }
        updated = { ...ledger, settings };
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
    res.status(200).json(withoutPinSecrets(updated));
  } catch (err) {
    if (err instanceof LedgerNotFoundError) {
      res.status(404).json({ error: "Nie znaleziono grupy — sprawdź link" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Nie udało się zapisać danych" });
  }
}
