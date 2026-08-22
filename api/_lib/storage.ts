// Storage abstraction: Vercel Blob in production, local JSON files under
// .data/groups/ for zero-setup local development. Selected automatically by
// the presence of BLOB_READ_WRITE_TOKEN. This is the ONLY code that touches
// the Blob token.
import { promises as fs } from "fs";
import path from "path";
import type { Ledger } from "../../shared/types.js";

function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// ---- Local file backend (dev convenience) ----

const LOCAL_DIR = path.join(process.cwd(), ".data");

// One file per group, so creating one can never clobber another.
function localFile(slug: string): string {
  return path.join(LOCAL_DIR, "groups", `${slug}.json`);
}

async function readLocalIfExists(slug: string): Promise<Ledger | null> {
  try {
    return JSON.parse(await fs.readFile(localFile(slug), "utf-8")) as Ledger;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function writeLocal(ledger: Ledger): Promise<void> {
  const file = localFile(ledger.slug);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(ledger, null, 2), "utf-8");
}

async function listLocal(): Promise<string[]> {
  const slugs: string[] = [];
  try {
    const names = await fs.readdir(path.join(LOCAL_DIR, "groups"));
    for (const name of names) {
      if (name.endsWith(".json")) slugs.push(name.slice(0, -5));
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  return slugs;
}

async function deleteLocal(slug: string): Promise<void> {
  await fs.rm(localFile(slug), { force: true });
}

// ---- Vercel Blob backend (production) ----

const blobKey = (slug: string) => `groups/${slug}/ledger.json`;

async function readBlobIfExists(slug: string): Promise<Ledger | null> {
  const { get } = await import("@vercel/blob");
  const key = blobKey(slug);

  // Private store: the blob is only readable with the store token, so this
  // authenticated read is the only way in. There is no public URL to leak.
  // useCache:false because every write is a read-modify-write — serving a
  // stale copy from the CDN would silently roll the ledger back.
  const existing = await get(key, {
    access: "private",
    useCache: false,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!existing) return null;

  const text = await new Response(existing.stream).text();
  return JSON.parse(text) as Ledger;
}

async function listBlob(): Promise<string[]> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({
    prefix: "groups/",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  // pathname looks like groups/<slug>/ledger.json
  return blobs
    .map((b) => b.pathname.split("/"))
    .filter((parts) => parts.length === 3 && parts[0] === "groups" && parts[2] === "ledger.json")
    .map((parts) => parts[1]);
}

async function deleteBlob(slug: string): Promise<void> {
  const { del } = await import("@vercel/blob");
  await del(blobKey(slug), { token: process.env.BLOB_READ_WRITE_TOKEN });
}

async function writeBlob(slug: string, ledger: Ledger): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(blobKey(slug), JSON.stringify(ledger, null, 2), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ---- Public API ----

/** The stored ledger for a slug, or null when there is nothing there. */
export async function getLedgerIfExists(slug: string): Promise<Ledger | null> {
  return isBlobConfigured() ? readBlobIfExists(slug) : readLocalIfExists(slug);
}

/** An unknown slug is a 404, never an invitation to create a group. */
export async function getLedger(slug: string): Promise<Ledger> {
  const existing = await getLedgerIfExists(slug);
  if (existing) return existing;
  throw new LedgerNotFoundError(slug);
}

export class LedgerNotFoundError extends Error {
  constructor(slug: string) {
    super(`Nie znaleziono grupy: ${slug}`);
    this.name = "LedgerNotFoundError";
  }
}

/**
 * Every write stamps updatedAt — that timestamp is what retention reads, so it
 * has to mean "last time a human did something here".
 *
 * Pass touch:false for bookkeeping writes that are not user activity, such as
 * archiving: otherwise the act of archiving an idle event would reset the very
 * clock that condemned it, and the admin console would report 0 idle days.
 */
export async function saveLedger(
  ledger: Ledger,
  { touch = true }: { touch?: boolean } = {},
): Promise<void> {
  const stamped: Ledger = touch ? { ...ledger, updatedAt: new Date().toISOString() } : ledger;
  if (isBlobConfigured()) {
    await writeBlob(stamped.slug, stamped);
  } else {
    await writeLocal(stamped);
  }
}

/** Refuses to overwrite, so a slug collision can never eat an existing event. */
export async function createLedger(ledger: Ledger): Promise<void> {
  if (await getLedgerIfExists(ledger.slug)) {
    throw new Error(`Slug jest już zajęty: ${ledger.slug}`);
  }
  await saveLedger(ledger);
}

/** Every stored slug. All groups are equal, so none is filtered out. */
export async function listGroupSlugs(): Promise<string[]> {
  const slugs = isBlobConfigured() ? await listBlob() : await listLocal();
  return [...new Set(slugs)];
}

export async function deleteGroup(slug: string): Promise<void> {
  if (isBlobConfigured()) {
    await deleteBlob(slug);
  } else {
    await deleteLocal(slug);
  }
}
