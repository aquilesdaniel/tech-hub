import {
  aplicarPagamentoConfirmado,
  localizarPagamento,
} from "@/lib/pagamentos";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

// evento: transparent.completed
const EVENTOS_DE_PAGAMENTO = new Set(["transparent.completed", "billing.paid"]);

function comparacaoSegura(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return (
    bufferA.length === bufferB.length &&
    crypto.timingSafeEqual(bufferA, bufferB)
  );
}

function assinaturaValida(corpoBruto: string, assinatura: string | null) {
  const chavePublica = process.env.ABACATEPAY_WEBHOOK_PUBLIC_KEY?.trim();

  if (!chavePublica) {
    return true;
  }

  if (!assinatura) {
    return false;
  }

  const esperada = crypto
    .createHmac("sha256", chavePublica)
    .update(Buffer.from(corpoBruto, "utf8"))
    .digest("base64");

  return comparacaoSegura(esperada, assinatura);
}

function textoOuNulo(valor: unknown) {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

function extrairIdentificadores(payload: Record<string, any>) {
  const dados = payload?.data ?? {};
  const cobranca =
    dados.transparent ?? dados.pixQrCode ?? dados.charge ?? dados;

  return {
    pixId:
      textoOuNulo(cobranca?.id) ??
      textoOuNulo(dados?.id) ??
      textoOuNulo(dados?.pixQrCodeId),
    externalId:
      textoOuNulo(cobranca?.externalId) ?? textoOuNulo(dados?.externalId),
  };
}

export async function POST(req: NextRequest) {
  const segredoEsperado = process.env.ABACATEPAY_WEBHOOK_SECRET?.trim();

  if (!segredoEsperado) {
    console.error(
      "A variável ABACATEPAY_WEBHOOK_SECRET não está configurada; webhook recusado.",
    );
    return NextResponse.json(
      { error: "Webhook não configurado" },
      { status: 500 },
    );
  }

  const segredoRecebido = req.nextUrl.searchParams.get("webhookSecret") ?? "";
  if (!comparacaoSegura(segredoRecebido, segredoEsperado)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const corpoBruto = await req.text();

  if (!assinaturaValida(corpoBruto, req.headers.get("x-webhook-signature"))) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(corpoBruto);
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const evento = String(payload?.event ?? "");

  if (!EVENTOS_DE_PAGAMENTO.has(evento)) {
    return NextResponse.json({ ignorado: true, evento });
  }

  try {
    const { pixId, externalId } = extrairIdentificadores(payload);
    const pagamento = await localizarPagamento(pixId, externalId);

    if (!pagamento) {
      console.error(
        `Webhook ${evento} recebido sem pagamento correspondente (pixId=${pixId}, externalId=${externalId}).`,
      );
      return NextResponse.json({ ignorado: true, motivo: "não encontrado" });
    }

    if (pixId && !pagamento.pix_id) {
      await prisma.pagamentos.update({
        where: { id: pagamento.id },
        data: { pix_id: pixId, updated_at: new Date() },
      });
    }

    const resultado = await aplicarPagamentoConfirmado(pagamento.id);

    if (resultado.divida_id) {
      revalidatePath("/salgados");
      revalidatePath(`/salgados/pagar/${resultado.divida_id}`);
      revalidatePath(`/salgados/detalhes/${resultado.divida_id}`);
    }

    return NextResponse.json({ recebido: true, ...resultado });
  } catch (error) {
    console.error(
      `Erro ao processar o webhook ${evento} da AbacatePay:`,
      error,
    );
    return NextResponse.json(
      { error: "Erro ao processar o webhook" },
      { status: 500 },
    );
  }
}
