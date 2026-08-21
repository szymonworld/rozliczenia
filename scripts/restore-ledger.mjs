// One-off restore: writes a backup JSON into the configured Blob store.
//
//   node scripts/restore-ledger.mjs backups/ledger-XXXX.json
//
// Reads BLOB_READ_WRITE_TOKEN from .env.local. Used when migrating between
// stores; the ledger is written under its canonical key so the API finds it.
import { readFileSync } from "node:fs";
import { put, get } from "@vercel/blob";

const GROUP_SLUG = "domownicy"; // canonical storage key, not the access slug

function loadToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const env = readFileSync(".env.local", "utf8");
  const line = env.split(/\r?\n/).find((l) => l.startsWith("BLOB_READ_WRITE_TOKEN="));
  if (!line) throw new Error("Brak BLOB_READ_WRITE_TOKEN w .env.local");
  return line.slice("BLOB_READ_WRITE_TOKEN=".length).trim().replace(/^["']|["']$/g, "");
}

const file = process.argv[2];
if (!file) throw new Error("Podaj ścieżkę do pliku kopii zapasowej");

const raw = readFileSync(file, "utf8");
const ledger = JSON.parse(raw);
if (!Array.isArray(ledger.members) || ledger.members.length === 0) {
  throw new Error("Kopia wygląda na pustą — przerywam");
}

const token = loadToken();
const key = `groups/${GROUP_SLUG}/ledger.json`;

await put(key, JSON.stringify(ledger, null, 2), {
  access: "private",
  contentType: "application/json",
  addRandomSuffix: false,
  allowOverwrite: true,
  token,
});

// Read it straight back so a silent failure cannot pass as success.
const check = await get(key, { access: "private", useCache: false, token });
if (!check) throw new Error("Zapis się nie powiódł — nie udało się odczytać z powrotem");
const roundTripped = JSON.parse(await new Response(check.stream).text());

console.log(
  `Przywrócono: ${roundTripped.members.length} osób, ${roundTripped.entries.length} wpisów`,
);
if (roundTripped.entries.length !== ledger.entries.length) {
  throw new Error("Liczba wpisów po zapisie się nie zgadza");
}
