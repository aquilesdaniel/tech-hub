import {
  enviarPix,
  ErroAbacatePay,
  paraCentavos,
  TIPOS_CHAVE_PIX,
  type TipoChavePix,
} from "@/lib/abacatepay";
import { ehAdmin } from "@/lib/permissoes";
import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";

const VALOR_MINIMO_REAIS = 1;

function chaveValida(chave: string, tipo: TipoChavePix) {
  const digitos = chave.replace(/\D/g, "");

  switch (tipo) {
    case "CPF":
      return digitos.length === 11;
    case "CNPJ":
      return digitos.length === 14;
    case "PHONE":
      return digitos.length >= 10 && digitos.length <= 13;
    case "EMAIL":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave);
    case "RANDOM":
      return chave.length >= 32;
  }
}

function normalizarChave(chave: string, tipo: TipoChavePix) {
  return tipo === "EMAIL" || tipo === "RANDOM"
    ? chave.trim()
    : chave.replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const { colaborador_id, amount, description, pix_key, pix_key_type } =
      await req.json();

    if (!(await ehAdmin(Number(colaborador_id)))) {
      return NextResponse.json(
        { error: "Apenas administradores podem solicitar saques" },
        { status: 403 },
      );
    }

    const valor = Number(amount);
    if (!Number.isFinite(valor) || valor < VALOR_MINIMO_REAIS) {
      return NextResponse.json(
        { error: `O valor mínimo para saque é de R$ ${VALOR_MINIMO_REAIS},00` },
        { status: 400 },
      );
    }

    const tipo = String(pix_key_type ?? "").toUpperCase() as TipoChavePix;
    if (!TIPOS_CHAVE_PIX.includes(tipo)) {
      return NextResponse.json(
        { error: "Selecione um tipo de chave PIX válido" },
        { status: 400 },
      );
    }

    const chave = String(pix_key ?? "").trim();
    if (!chave || !chaveValida(chave, tipo)) {
      return NextResponse.json(
        { error: "Informe uma chave PIX válida para o tipo selecionado" },
        { status: 400 },
      );
    }

    const transferencia = await enviarPix({
      amount: paraCentavos(valor),
      externalId: crypto.randomUUID(),
      description: String(description ?? "").trim() || "Saque de salgados",
      pix: { key: normalizarChave(chave, tipo), type: tipo },
    });

    return NextResponse.json(transferencia, { status: 201 });
  } catch (error) {
    if (error instanceof ErroAbacatePay) {
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
