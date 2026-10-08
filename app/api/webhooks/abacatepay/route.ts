import {
  applyConfirmedPayment,
  findPayment,
} from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

// evento: transparent.completed
const PAYMENT_EVENTS = new Set(["transparent.completed", "billing.paid"]);

function safeCompare(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return (
    bufferA.length === bufferB.length &&
    crypto.timingSafeEqual(bufferA, bufferB)
  );
}

function isValidSignature(rawBody: string, signature: string | null) {
  const publicKey = process.env.ABACATEPAY_WEBHOOK_PUBLIC_KEY?.trim();

  if (!publicKey) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", publicKey)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  return safeCompare(expected, signature);
}

function textOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractIdentifiers(payload: Record<string, any>) {
  const data = payload?.data ?? {};
  const charge =
    data.transparent ?? data.pixQrCode ?? data.charge ?? data;

  return {
    pixId:
      textOrNull(charge?.id) ??
      textOrNull(data?.id) ??
      textOrNull(data?.pixQrCodeId),
    externalId:
      textOrNull(charge?.externalId) ?? textOrNull(data?.externalId),
  };
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.ABACATEPAY_WEBHOOK_SECRET?.trim();

  if (!expectedSecret) {
    console.error(
      "A variável ABACATEPAY_WEBHOOK_SECRET não está configurada; webhook recusado.",
    );
    return NextResponse.json(
      { error: "Webhook não configurado" },
      { status: 500 },
    );
  }

  const receivedSecret = req.nextUrl.searchParams.get("webhookSecret") ?? "";
  if (!safeCompare(receivedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const rawBody = await req.text();

  if (!isValidSignature(rawBody, req.headers.get("x-webhook-signature"))) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let payload: Record<string, any>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const event = String(payload?.event ?? "");

  if (!PAYMENT_EVENTS.has(event)) {
    return NextResponse.json({ ignored: true, event });
  }

  try {
    const { pixId, externalId } = extractIdentifiers(payload);
    const payment = await findPayment(pixId, externalId);

    if (!payment) {
      console.error(
        `Webhook ${event} recebido sem pagamento correspondente (pixId=${pixId}, externalId=${externalId}).`,
      );
      return NextResponse.json({ ignored: true, reason: "não encontrado" });
    }

    if (pixId && !payment.pix_id) {
      await prisma.pagamentos.update({
        where: { id: payment.id },
        data: { pix_id: pixId, updated_at: new Date() },
      });
    }

    const result = await applyConfirmedPayment(payment.id);

    if (result.divida_id) {
      revalidatePath("/salgados");
      revalidatePath(`/salgados/pagar/${result.divida_id}`);
      revalidatePath(`/salgados/detalhes/${result.divida_id}`);
    }

    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error(
      `Erro ao processar o webhook ${event} da AbacatePay:`,
      error,
    );
    return NextResponse.json(
      { error: "Erro ao processar o webhook" },
      { status: 500 },
    );
  }
}
