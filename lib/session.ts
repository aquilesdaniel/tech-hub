import { isAdmin } from "@/lib/permissions";
import { type NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "session";

// oito horas
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

// nao confundir com criptografia é apenas uma assinatura, qualquer um pode decodificar e ver o id, mas o sisema controla essa permissao dessa forma
function sign(payload: string) {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET não configurado");
  }

  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// cria o cache de sessao aqui
export function createSessionToken(employeeId: number, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({
      id: employeeId,
      exp: now + SESSION_MAX_AGE_SECONDS * 1000,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

// verifica a sessao, retorna o id ou null
export function readSessionToken(token?: string | null): number | null {
  const [payload, signature] = token?.split(".") ?? [];

  if (!payload || !signature) {
    return null;
  }

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  const { id, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());

  return typeof id === "number" && exp > Date.now() ? id : null;
}

export function withSession(response: NextResponse, employeeId: number) {
  response.cookies.set(SESSION_COOKIE, createSessionToken(employeeId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export async function denyUnlessOwnerOrAdmin(
  req: NextRequest,
  ownerId: number | null,
) {
  const employeeId = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (employeeId === null) {
    return NextResponse.json(
      { error: "Faça login para continuar" },
      { status: 401 },
    );
  }

  if (employeeId === ownerId || (await isAdmin(employeeId))) {
    return null;
  }

  return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
}
