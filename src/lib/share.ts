// Building and sharing a plain-text settlement summary — the thing you paste
// into the group chat.
import type { Entry, Member } from "../../shared/types";
import type { NetBalances, SuggestedTransfer } from "./balances";
import { formatGrosze } from "./money";

function nameOf(members: Member[], id: string) {
  return members.find((m) => m.id === id)?.name ?? id;
}

export function buildSummaryText(
  members: Member[],
  balances: NetBalances,
  transfers: SuggestedTransfer[],
): string {
  const lines: string[] = ["Rozliczenia — stan na dziś", ""];

  for (const m of members) {
    const balance = balances[m.id] ?? 0;
    const state =
      balance === 0
        ? "na zero"
        : balance > 0
          ? `dostaje ${formatGrosze(balance)}`
          : `oddaje ${formatGrosze(-balance)}`;
    lines.push(`• ${m.name}: ${state}`);
  }

  if (transfers.length > 0) {
    lines.push("", "Przelewy do wykonania:");
    for (const t of transfers) {
      lines.push(
        `• ${nameOf(members, t.fromId)} → ${nameOf(members, t.toId)}: ${formatGrosze(t.amountGrosze)}`,
      );
    }
  } else {
    lines.push("", "Wszystko rozliczone.");
  }

  return lines.join("\n");
}

/** Native share sheet when available, clipboard otherwise. Returns what happened. */
export async function shareText(
  title: string,
  text: string,
): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      // User dismissing the sheet is not a failure worth reporting.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
    }
  }
  return (await copyText(text)) ? "copied" : "failed";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** CSV of every entry, for spreadsheets. Semicolon-delimited for Excel PL. */
export function buildCsv(members: Member[], entries: Entry[]): string {
  // waluta/kwota_waluta/kurs stay empty for base-currency rows, so a
  // spreadsheet of PLN-only expenses looks exactly as it did before.
  const head = [
    "data",
    "typ",
    "opis",
    "kwota_pln",
    "waluta",
    "kwota_waluta",
    "kurs",
    "zaplacil",
    "od",
    "do",
    "podzial",
    "usuniety",
  ];
  const rows = [...entries]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((e) => {
      const amount = (e.amountGrosze / 100).toFixed(2).replace(".", ",");
      if (e.type === "expense") {
        const split = e.shares
          .map((s) => `${nameOf(members, s.memberId)}=${(s.amountGrosze / 100).toFixed(2)}`)
          .join(" ");
        return [
          e.date,
          "wydatek",
          e.description,
          amount,
          e.foreign?.code ?? "",
          e.foreign ? (e.foreign.amountMinor / 100).toFixed(2).replace(".", ",") : "",
          e.foreign ? String(e.foreign.rate).replace(".", ",") : "",
          nameOf(members, e.payerId),
          "",
          "",
          split,
          e.deletedAt ? "tak" : "",
        ];
      }
      return [
        e.date,
        "rozliczenie",
        "",
        amount,
        e.foreign?.code ?? "",
        e.foreign ? (e.foreign.amountMinor / 100).toFixed(2).replace(".", ",") : "",
        e.foreign ? String(e.foreign.rate).replace(".", ",") : "",
        "",
        nameOf(members, e.fromId),
        nameOf(members, e.toId),
        "",
        e.deletedAt ? "tak" : "",
      ];
    });

  const escape = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [head, ...rows].map((r) => r.map(escape).join(";")).join("\n");
}

/** Triggers a file download in the browser. */
export function downloadFile(filename: string, content: string, mime: string) {
  // BOM so Excel opens UTF-8 Polish characters correctly.
  const blob = new Blob(["﻿", content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
