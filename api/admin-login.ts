import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  clearFailures,
  clearSessionCookie,
  issueSession,
  rateLimited,
  recordFailure,
  setSessionCookie,
  verifyAdminSecret,
} from "./_lib/adminAuth.js";

/**
 * Exchanges ADMIN_TOKEN for a short-lived HttpOnly session cookie, so the
 * secret itself never has to live in the browser. DELETE ends the session.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "DELETE") {
    clearSessionCookie(req, res);
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Metoda niedozwolona" });
    return;
  }

  if (rateLimited(req)) {
    res.status(429).json({ error: "Zbyt wiele prób. Spróbuj ponownie za kilkanaście minut." });
    return;
  }

  let body: { token?: unknown };
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: "Nieprawidłowe dane żądania" });
    return;
  }

  if (!verifyAdminSecret(body?.token)) {
    recordFailure(req);
    // Same message whether the token is wrong or unset — no probing.
    res.status(401).json({ error: "Nieprawidłowy token" });
    return;
  }

  const session = issueSession();
  if (!session) {
    res.status(401).json({ error: "Nieprawidłowy token" });
    return;
  }

  clearFailures(req);
  setSessionCookie(req, res, session);
  res.status(200).json({ ok: true });
}
