import { getStoreBalance, AbacatePayError } from "@/lib/abacatepay";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const balance = await getStoreBalance();
    return NextResponse.json(balance);
  } catch (error) {
    if (error instanceof AbacatePayError) {
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
