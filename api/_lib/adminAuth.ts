// Authentication for the admin console.
//
// The console is protected by ADMIN_TOKEN, but that secret is never kept in
// the browser. Logging in exchanges it for a short-lived, HMAC-signed session
// held in an HttpOnly cookie, so script running on the page — injected or
// otherwise — cannot read it, and a stolen session expires on its own.
//
// Without ADMIN_TOKEN set, every check fails closed: a deployment that never
// configures one simply has no admin surface.
import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const COOKIE = "rozl_admin";
const SESSION_TTL_SECONDS = 60 * 60; // an hour at the console is plenty

/** Attempts allowed per client before the door closes for a while. */
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

type Attempts = { count: number; resetAt: number };

/**
 * Per-instance brute-force brake. Serverless means this is not a global
 * counter, but an attacker still has to get lucky on the same warm instance
 * repeatedly, which turns an online guessing attack from feasible into not.
 */
const attempts = new Map<string, Attempts>();

function clientKey(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (raw ?? "").split(",")[0].trim() || "unknown";
}

export function rateLimited(req: VercelRequest): boolean {
  const record = attempts.get(clientKey(req));
  if (!record) return false;
  if (Date.now() > record.resetAt) {
    attempts.delete(clientKey(req));
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

export function recordFailure(req: VercelRequest): void {
  const key = clientKey(req);
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return;
  }
  record.count += 1;
}

export function clearFailures(req: VercelRequest): void {
  attempts.delete(clientKey(req));
}

/**
 * Compares hashes rather than the raw values: both sides are then always 32
 * bytes, so neither the comparison nor its setup leaks the secret's length.
 */
function secretMatches(supplied: string, expected: string): boolean {
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function verifyAdminSecret(supplied: unknown): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || typeof supplied !== "string" || supplied.length === 0) return false;
  return secretMatches(supplied, expected);
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** `<base64url payload>.<hmac>`; the payload carries only an id and expiry. */
export function issueSession(): string | null {
  const key = process.env.ADMIN_TOKEN;
  if (!key) return null;
  const payload = Buffer.from(
    JSON.stringify({ id: randomUUID(), exp: Date.now() + SESSION_TTL_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

function sessionValid(token: string): boolean {
  const key = process.env.ADMIN_TOKEN;
  if (!key) return false;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const supplied = token.slice(dot + 1);

  const expected = sign(payload, key);
  if (supplied.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: number };
    return typeof exp === "number" && Date.now() < exp;
  } catch {
    return false;
  }
}

function readCookie(req: VercelRequest, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function hasAdminSession(req: VercelRequest): boolean {
  const token = readCookie(req, COOKIE);
  return Boolean(token && sessionValid(token));
}

/** Secure is skipped on plain-http local dev, where the browser would drop it. */
function isSecure(req: VercelRequest): boolean {
  const proto = req.headers["x-forwarded-proto"];
  const value = Array.isArray(proto) ? proto[0] : proto;
  if (value) return value === "https";
  return !String(req.headers.host ?? "").startsWith("localhost");
}

export function setSessionCookie(req: VercelRequest, res: VercelResponse, token: string): void {
  const flags = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/api",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (isSecure(req)) flags.push("Secure");
  res.setHeader("Set-Cookie", flags.join("; "));
}

export function clearSessionCookie(req: VercelRequest, res: VercelResponse): void {
  const flags = [`${COOKIE}=`, "HttpOnly", "SameSite=Strict", "Path=/api", "Max-Age=0"];
  if (isSecure(req)) flags.push("Secure");
  res.setHeader("Set-Cookie", flags.join("; "));
}
