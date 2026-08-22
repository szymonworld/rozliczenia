import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createLedger, getLedgerIfExists } from "./_lib/storage.js";
import { newSlug, resolveSlug } from "./_lib/access.js";
import { hasAdminSession } from "./_lib/adminAuth.js";
import type { GroupCreateRequest, Ledger, Member } from "../shared/types.js";

const MAX_MEMBERS = 30;
const MAX_NAME = 60;

/** A stable, readable id per member, unique within the new event. */
function memberId(name: string, taken: Set<string>): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .split("")
      .filter((ch) => ch.charCodeAt(0) < 128)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "osoba";

  let id = base;
  let n = 1;
  while (taken.has(id)) id = `${base}-${n++}`;
  taken.add(id);
  return id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metoda niedozwolona" });
    return;
  }

  let body: GroupCreateRequest;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Nieprawidłowe dane żądania" });
    return;
  }

  // Anyone who can open a group may spin off another; everyone else needs the
  // admin console. Without this the endpoint is an open group factory.
  if (!hasAdminSession(req)) {
    const from = resolveSlug(body?.fromSlug);
    const source = from ? await getLedgerIfExists(from) : null;
    if (!source || source.archivedAt) {
      res.status(401).json({ error: "Brak uprawnień do tworzenia wydarzeń" });
      return;
    }
  }

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
  if (!name) {
    res.status(400).json({ error: "Nazwa wydarzenia jest wymagana" });
    return;
  }

  const names = Array.isArray(body?.memberNames)
    ? body.memberNames
        .filter((n): n is string => typeof n === "string")
        .map((n) => n.trim().slice(0, MAX_NAME))
        .filter(Boolean)
    : [];

  if (names.length < 2) {
    res.status(400).json({ error: "Wydarzenie potrzebuje co najmniej dwóch osób" });
    return;
  }
  if (names.length > MAX_MEMBERS) {
    res.status(400).json({ error: `Maksymalnie ${MAX_MEMBERS} osób w wydarzeniu` });
    return;
  }

  const taken = new Set<string>();
  const members: Member[] = names.map((n) => ({ id: memberId(n, taken), name: n }));
  const now = new Date().toISOString();

  const ledger: Ledger = {
    slug: newSlug(),
    members,
    entries: [],
    settings: { groupName: name },
    createdAt: now,
    updatedAt: now,
  };

  try {
    await createLedger(ledger);
    res.status(201).json({ slug: ledger.slug, ledger });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Nie udało się utworzyć wydarzenia" });
  }
}
