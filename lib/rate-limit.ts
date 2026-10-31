import { type NextRequest, NextResponse } from "next/server";

const MAX_TRACKED_KEYS = 10_000;

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  req: NextRequest,
  identifier = "",
  limit = 5,
  windowMs = 60_000,
) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${req.nextUrl.pathname}:${ip}:${identifier.toLowerCase()}`;
  const now = Date.now();

  if (attempts.size > MAX_TRACKED_KEYS) {
    for (const [storedKey, entry] of attempts) {
      if (entry.resetAt <= now) {
        attempts.delete(storedKey);
      }
    }
  }

  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count += 1;

  if (entry.count <= limit) {
    return null;
  }

  return NextResponse.json(
    { error: "Muitas tentativas. Aguarde um minuto e tente novamente." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
      },
    },
  );
}
