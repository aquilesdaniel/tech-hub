import { SESSION_COOKIE } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Sessão encerrada" });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
