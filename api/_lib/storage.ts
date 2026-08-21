// Storage abstraction: Vercel Blob in production, a local JSON file for
// zero-setup local development. Selected automatically by the presence of
// BLOB_READ_WRITE_TOKEN. This is the ONLY code that touches the Blob token.
import { promises as fs } from "fs";
import path from "path";
import type { Ledger } from "../../shared/types.js";
import { GROUP_SLUG } from "../../shared/types.js";

function seedLedger(): Ledger {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const members = [
    { id: "szymon", name: "Szymon" },
    { id: "jarek", name: "Jarek" },
    { id: "alan", name: "Alan" },
    { id: "dawid", name: "Dawid" },
  ];
  return {
    slug: GROUP_SLUG,
    members,
    entries: [
      {
        id: "seed-1",
        type: "expense",
        description: "Zakupy na grilla",
        amountGrosze: 12000,
        payerId: "szymon",
        date: today,
        shares: [
          { memberId: "szymon", amountGrosze: 3000 },
          { memberId: "jarek", amountGrosze: 3000 },
          { memberId: "alan", amountGrosze: 3000 },
          { memberId: "dawid", amountGrosze: 3000 },
        ],
        createdAt: now,
        createdBy: "szymon",
      },
      {
        id: "seed-2",
        type: "expense",
        description: "Piwo",
        amountGrosze: 4500,
        payerId: "jarek",
        date: today,
        shares: [
          { memberId: "jarek", amountGrosze: 1500 },
          { memberId: "alan", amountGrosze: 1500 },
          { memberId: "dawid", amountGrosze: 1500 },
        ],
        createdAt: now,
        createdBy: "jarek",
      },
    ],
  };
}

function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// ---- Local file backend (dev convenience) ----

const LOCAL_DIR = path.join(process.cwd(), ".data");
const LOCAL_FILE = path.join(LOCAL_DIR, "ledger.json");

async function readLocal(): Promise<Ledger> {
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf-8");
    return JSON.parse(raw) as Ledger;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const seeded = seedLedger();
      await writeLocal(seeded);
      return seeded;
    }
    throw err;
  }
}

async function writeLocal(ledger: Ledger): Promise<void> {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(ledger, null, 2), "utf-8");
}

// ---- Vercel Blob backend (production) ----

const blobKey = (slug: string) => `groups/${slug}/ledger.json`;

async function readBlob(slug: string): Promise<Ledger> {
  const { list, put } = await import("@vercel/blob");
  const key = blobKey(slug);
  const { blobs } = await list({ prefix: key, limit: 1 });
  const existing = blobs.find((b) => b.pathname === key);
  if (!existing) {
    const seeded = seedLedger();
    await put(key, JSON.stringify(seeded, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return seeded;
  }
  const res = await fetch(existing.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Nie udało się pobrać danych (status ${res.status})`);
  return (await res.json()) as Ledger;
}

async function writeBlob(slug: string, ledger: Ledger): Promise<void> {
  const { put } = await import("@vercel/blob");
  const key = blobKey(slug);
  await put(key, JSON.stringify(ledger, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ---- Public API ----

export async function getLedger(slug: string = GROUP_SLUG): Promise<Ledger> {
  return isBlobConfigured() ? readBlob(slug) : readLocal();
}

export async function saveLedger(ledger: Ledger): Promise<void> {
  if (isBlobConfigured()) {
    await writeBlob(ledger.slug, ledger);
  } else {
    await writeLocal(ledger);
  }
}
