import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  deleteGroup,
  getLedgerIfExists,
  listGroupSlugs,
  saveLedger,
} from "./_lib/storage.js";
import { hasAdminSession } from "./_lib/adminAuth.js";
import { GROUP_SLUG, stalenessOf, STALE_DAYS, VERY_STALE_DAYS } from "../shared/types.js";
import type { AdminActionRequest, AdminGroupSummary, Ledger } from "../shared/types.js";

/**
 * Admin console backend: lists every stored event — archived ones included —
 * and can archive, restore, or permanently purge one. Every removal here is
 * a deliberate human action — nothing in this app deletes on a timer.
 *
 * Every request needs a live session cookie from /api/admin-login; the raw
 * ADMIN_TOKEN is only ever seen by that endpoint. Without ADMIN_TOKEN set,
 * sessions cannot be issued or verified at all, so the console stays shut.
 */

function idleDays(ledger: Ledger): number | null {
  const last = ledger.updatedAt ?? ledger.createdAt;
  if (!last) return null;
  const then = Date.parse(last);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

function summarise(ledger: Ledger): AdminGroupSummary {
  const idle = idleDays(ledger);
  return {
    slug: ledger.slug,
    name: ledger.settings?.groupName?.trim() || "Rozliczenia",
    memberCount: ledger.members.length,
    entryCount: ledger.entries.filter((e) => !e.deletedAt).length,
    createdAt: ledger.createdAt,
    updatedAt: ledger.updatedAt,
    archivedAt: ledger.archivedAt,
    archivedBy: ledger.archivedBy,
    idleDays: idle,
    staleness: stalenessOf(idle),
    pinEnabled: Boolean(ledger.pin),
    isPrimary: ledger.slug === GROUP_SLUG,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!hasAdminSession(req)) {
    res.status(401).json({ error: "Brak autoryzacji" });
    return;
  }

  try {
    if (req.method === "GET") {
      const slugs = await listGroupSlugs();
      const groups: AdminGroupSummary[] = [];
      for (const slug of slugs) {
        const ledger = await getLedgerIfExists(slug);
        if (ledger) groups.push(summarise(ledger));
      }
      // Most recently touched first; that is the order an operator scans in.
      groups.sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
      });

      res.status(200).json({
        staleDays: STALE_DAYS,
        veryStaleDays: VERY_STALE_DAYS,
        groups,
      });
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Metoda niedozwolona" });
      return;
    }

    const body: AdminActionRequest =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const slug = typeof body?.slug === "string" ? body.slug : "";
    const ledger = slug ? await getLedgerIfExists(slug) : null;
    if (!ledger) {
      res.status(404).json({ error: "Nie znaleziono wydarzenia" });
      return;
    }

    // The original group is listed so it can be inspected and unlocked, but
    // removing it would strand every existing link.
    if (slug === GROUP_SLUG && (body.action === "archive" || body.action === "purge")) {
      res.status(409).json({ error: "Głównej grupy nie można usunąć" });
      return;
    }

    switch (body.action) {
      case "archive":
        await saveLedger(
          { ...ledger, archivedAt: new Date().toISOString(), archivedBy: "admin" },
          { touch: false },
        );
        break;
      case "restore": {
        // Drop the archive stamps entirely rather than blanking them, so a
        // restored event is indistinguishable from one never archived.
        const { archivedAt: _a, archivedBy: _b, ...rest } = ledger;
        // Touched on purpose: a restored event deserves a fresh retention
        // window, or the next nightly run would archive it straight back.
        await saveLedger(rest);
        break;
      }
      case "clear-pin": {
        // The only way back into an event whose PIN was forgotten. Drops the
        // signing secret with it, so every existing unlock token dies too.
        if (!ledger.pin) break;
        const { pin: _pin, ...rest } = ledger;
        await saveLedger(rest, { touch: false });
        break;
      }
      case "purge":
        // The only path in the whole app that destroys data, and it is
        // deliberately not reachable from the phone UI.
        await deleteGroup(slug);
        break;
      default:
        res.status(400).json({ error: "Nieznana akcja" });
        return;
    }

    const after = await getLedgerIfExists(slug);
    res.status(200).json({ ok: true, group: after ? summarise(after) : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Operacja nie powiodła się" });
  }
}
