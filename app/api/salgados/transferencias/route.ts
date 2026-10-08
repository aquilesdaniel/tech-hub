import {
  sendPix,
  AbacatePayError,
  toCents,
  PIX_KEY_TYPES,
  type PixKeyType,
} from "@/lib/abacatepay";
import { isAdmin } from "@/lib/permissions";
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";

const MIN_AMOUNT_REAIS = 1;

function isValidKey(key: string, type: PixKeyType) {
  const digits = key.replace(/\D/g, "");

  switch (type) {
    case "CPF":
      return digits.length === 11;
    case "CNPJ":
      return digits.length === 14;
    case "PHONE":
      return digits.length >= 10 && digits.length <= 13;
    case "EMAIL":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
    case "RANDOM":
      return key.length >= 32;
  }
}

function normalizeKey(key: string, type: PixKeyType) {
  return type === "EMAIL" || type === "RANDOM"
    ? key.trim()
    : key.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const {
      colaborador_id: employeeId,
      amount,
      description,
      pix_key,
      pix_key_type,
    } = await req.json();

    if (!(await isAdmin(Number(employeeId)))) {
      return NextResponse.json(
        { error: "Apenas administradores podem solicitar saques" },
        { status: 403 },
      );
    }

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue < MIN_AMOUNT_REAIS) {
      return NextResponse.json(
        { error: `O valor mínimo para saque é de R$ ${MIN_AMOUNT_REAIS},00` },
        { status: 400 },
      );
    }

    const type = String(pix_key_type ?? "").toUpperCase() as PixKeyType;
    if (!PIX_KEY_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Selecione um tipo de chave PIX válido" },
        { status: 400 },
      );
    }

    const key = String(pix_key ?? "").trim();
    if (!key || !isValidKey(key, type)) {
      return NextResponse.json(
        { error: "Informe uma chave PIX válida para o tipo selecionado" },
        { status: 400 },
      );
    }

    const transfer = await sendPix({
      amount: toCents(amountValue),
      externalId: crypto.randomUUID(),
      description: String(description ?? "").trim() || "Saque de salgados",
      pix: { key: normalizeKey(key, type), type },
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    if (error instanceof AbacatePayError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Erro ao solicitar a transferência PIX:", error);
    return NextResponse.json(
      { error: "Erro interno ao solicitar a transferência" },
      { status: 500 },
    );
  }
}
