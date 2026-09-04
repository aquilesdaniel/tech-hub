import { consultarSaldoLoja, ErroAbacatePay } from "@/lib/abacatepay";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const saldo = await consultarSaldoLoja();
    return NextResponse.json(saldo);
  } catch (error) {
    if (error instanceof ErroAbacatePay) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Erro ao consultar o saldo da loja:", error);
    return NextResponse.json(
      { error: "Erro interno ao consultar o saldo" },
      { status: 500 },
    );
  }
}
