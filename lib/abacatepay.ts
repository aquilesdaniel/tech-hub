import "dotenv/config";

const BASE_URL = "https://api.abacatepay.com";

export const PIX_KEY_TYPES = [
  "CPF",
  "CNPJ",
  "EMAIL",
  "PHONE",
  "RANDOM",
] as const;

export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

export class AbacatePayError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AbacatePayError";
    this.status = status;
  }
}

type ApiVersion = "v1" | "v2";

function apiKeyForVersion(version: ApiVersion) {
  const key =
    version === "v1"
      ? process.env.API_KEY_ABACATEPAY_V1
      : process.env.API_KEY_ABACATEPAY_V2;

  if (!key?.trim()) {
    throw new AbacatePayError(
      `A variável API_KEY_ABACATEPAY_${version.toUpperCase()} não está configurada.`,
      500,
    );
  }

  return key.trim();
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string>;
}

async function request<T>(
  version: ApiVersion,
  path: string,
  { method = "GET", body, query }: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${BASE_URL}/${version}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKeyForVersion(version)}`,
        "Content-Type": "application/json",
      },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      cache: "no-store",
    });
  } catch (error) {
    console.error(`Falha de rede ao chamar ${path} na AbacatePay:`, error);
    throw new AbacatePayError("Não foi possível se comunicar com a AbacatePay.");
  }

  const text = await response.text();

  let json: { data?: T; error?: unknown; message?: unknown } | null = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    console.error(
      `A AbacatePay respondeu ${response.status} em ${path}:`,
      text,
    );
    throw new AbacatePayError(
      errorMessage(json) ?? "A AbacatePay recusou a requisição.",
    );
  }

  if (json?.error) {
    console.error(`A AbacatePay retornou erro em ${path}:`, json.error);
    throw new AbacatePayError(
      errorMessage(json) ?? "A AbacatePay retornou um erro.",
    );
  }

  if (json?.data === undefined || json.data === null) {
    throw new AbacatePayError("A AbacatePay retornou uma resposta vazia.");
  }

  return json.data;
}

function errorMessage(json: { error?: unknown; message?: unknown } | null) {
  for (const candidate of [json?.error, json?.message]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (candidate && typeof candidate === "object") {
      const { message } = candidate as { message?: unknown };
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return null;
}

export function toCents(amountInReais: number) {
  return Math.round(Number(amountInReais) * 100);
}

export function toReais(amountInCents: number) {
  return Number(amountInCents ?? 0) / 100;
}

export interface PixCharge {
  id: string;
  amount: number;
  status: string;
  devMode: boolean;
  brCode: string;
  brCodeBase64: string;
  platformFee: number;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  metadata: Record<string, unknown>;
}

export interface PixChargeData {
  amount: number;
  expiresIn: number;
  description: string;
  externalId: string;
  customer: {
    name: string;
    taxId: string;
    email: string;
    cellphone: string;
  };
}

export function createPixCharge(data: PixChargeData) {
  return request<PixCharge>("v2", "/transparents/create", {
    method: "POST",
    body: { method: "PIX", data },
  });
}

export function getPixCharge(id: string) {
  return request<Partial<PixCharge> & { status: string }>(
    "v2",
    "/transparents/check",
    { query: { id } },
  );
}

export function simulatePixPayment(id: string) {
  return request<Partial<PixCharge>>("v2", "/transparents/simulate-payment", {
    method: "POST",
    body: { metadata: {} },
    query: { id },
  });
}

export interface SendPixData {
  amount: number;
  externalId: string;
  description: string;
  pix: { key: string; type: PixKeyType };
}

export interface SentPix {
  id: string;
  status: string;
  amount: number;
  platformFee: number;
  externalId: string;
  createdAt: string;
}

export function sendPix(data: SendPixData) {
  return request<SentPix>("v2", "/pix/send", {
    method: "POST",
    body: data,
  });
}

export interface StoreBalance {
  available: number;
  pending: number;
  blocked: number;
}

function firstNumber(...candidates: unknown[]) {
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (candidate !== null && candidate !== undefined && !Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
}

export async function getStoreBalance(): Promise<StoreBalance> {
  const store = await request<Record<string, any>>("v1", "/store/get");
  const balance = (store.balance ?? store) as Record<string, unknown>;

  return {
    available: toReais(
      firstNumber(balance.available, balance.availableAmount, store.available),
    ),
    pending: toReais(
      firstNumber(balance.pending, balance.waitingFunds, store.pending),
    ),
    blocked: toReais(firstNumber(balance.blocked, store.blocked)),
  };
}

/**
 * Converte o status da AbacatePay (PENDING, PAID, ...) para o vocabulário já
 * usado na coluna `pagamentos.status` e nas telas do sistema.
 */
export function toInternalStatus(abacateStatus?: string | null) {
  switch (String(abacateStatus ?? "").toUpperCase()) {
    case "PAID":
    case "COMPLETED":
    case "APPROVED":
      return "paid";
    case "PENDING":
    case "PROCESSING":
    case "WAITING":
      return "pending";
    case "EXPIRED":
    case "CANCELLED":
    case "CANCELED":
      return "canceled";
    case "REFUNDED":
      return "refunded";
    default:
      return "failed";
  }
}
