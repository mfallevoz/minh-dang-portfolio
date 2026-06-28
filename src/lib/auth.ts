import "server-only";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "md_admin";

// Local dev fallback. ALWAYS set ADMIN_PASSWORD in production (Vercel env var).
const PASSWORD = process.env.ADMIN_PASSWORD || "changeme";

function tokenFor(value: string): string {
  return createHash("sha256").update("md::" + value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// The opaque session token stored in the cookie (never the password itself).
export function sessionToken(): string {
  return tokenFor(PASSWORD);
}

export function checkPassword(password: string): boolean {
  return safeEqual(tokenFor(password), sessionToken());
}

export async function isAuthed(): Promise<boolean> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  return !!cookie && safeEqual(cookie, sessionToken());
}
