import "dotenv/config";

const URL_BASE = "https://api.abacatepay.com";

export const TIPOS_CHAVE_PIX = [
  "CPF",
  "CNPJ",
  "EMAIL",
  "PHONE",
  "RANDOM",
] as const;

export type TipoChavePix = (typeof TIPOS_CHAVE_PIX)[number];

export class ErroAbacatePay extends Error {
  readonly status: number;

  constructor(mensagem: string, status = 502) {
    super(mensagem);
    this.name = "ErroAbacatePay";
    this.status = status;
  }
}

type Versao = "v1" | "v2";

function chaveDaVersao(versao: Versao) {
  const chave =
    versao === "v1"
      ? process.env.API_KEY_ABACATEPAY_V1
      : process.env.API_KEY_ABACATEPAY_V2;

  if (!chave?.trim()) {
    throw new ErroAbacatePay(
      `A variável API_KEY_ABACATEPAY_${versao.toUpperCase()} não está configurada.`,
      500,
    );
  }

  return chave.trim();
}

interface OpcoesRequisicao {
  metodo?: "GET" | "POST";
  corpo?: unknown;
  query?: Record<string, string>;
}

async function requisitar<T>(
  versao: Versao,
  caminho: string,
  { metodo = "GET", corpo, query }: OpcoesRequisicao = {},
): Promise<T> {
  const url = new URL(`${URL_BASE}/${versao}${caminho}`);
  for (const [chave, valor] of Object.entries(query ?? {})) {
    url.searchParams.set(chave, valor);
  }

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${chaveDaVersao(versao)}`,
        "Content-Type": "application/json",
      },
      body: metodo === "POST" ? JSON.stringify(corpo ?? {}) : undefined,
      cache: "no-store",
    });
  } catch (erro) {
    console.error(`Falha de rede ao chamar ${caminho} na AbacatePay:`, erro);
    throw new ErroAbacatePay("Não foi possível se comunicar com a AbacatePay.");
  }

  const texto = await resposta.text();

  let json: { data?: T; error?: unknown; message?: unknown } | null = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = null;
  }

  if (!resposta.ok) {
    console.error(
      `A AbacatePay respondeu ${resposta.status} em ${caminho}:`,
      texto,
    );
    throw new ErroAbacatePay(
      mensagemDeErro(json) ?? "A AbacatePay recusou a requisição.",
    );
  }

  if (json?.error) {
    console.error(`A AbacatePay retornou erro em ${caminho}:`, json.error);
    throw new ErroAbacatePay(
      mensagemDeErro(json) ?? "A AbacatePay retornou um erro.",
    );
  }

  if (json?.data === undefined || json.data === null) {
    throw new ErroAbacatePay("A AbacatePay retornou uma resposta vazia.");
  }

  return json.data;
}

function mensagemDeErro(json: { error?: unknown; message?: unknown } | null) {
  for (const candidato of [json?.error, json?.message]) {
    if (typeof candidato === "string" && candidato.trim()) return candidato;
    if (candidato && typeof candidato === "object") {
      const { message } = candidato as { message?: unknown };
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return null;
}

export function paraCentavos(valorEmReais: number) {
  return Math.round(Number(valorEmReais) * 100);
}

export function paraReais(valorEmCentavos: number) {
  return Number(valorEmCentavos ?? 0) / 100;
}

export interface CobrancaPix {
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

export interface DadosCobrancaPix {
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

export function criarCobrancaPix(dados: DadosCobrancaPix) {
  return requisitar<CobrancaPix>("v2", "/transparents/create", {
    metodo: "POST",
    corpo: { method: "PIX", data: dados },
  });
}

export function consultarCobrancaPix(id: string) {
  return requisitar<Partial<CobrancaPix> & { status: string }>(
    "v2",
    "/transparents/check",
    { query: { id } },
  );
}

export function simularPagamentoPix(id: string) {
  return requisitar<Partial<CobrancaPix>>("v2", "/transparents/simulate-payment", {
    metodo: "POST",
    corpo: { metadata: {} },
    query: { id },
  });
}

export interface DadosEnvioPix {
  amount: number;
  externalId: string;
  description: string;
  pix: { key: string; type: TipoChavePix };
}

export interface EnvioPix {
  id: string;
  status: string;
  amount: number;
  platformFee: number;
  externalId: string;
  createdAt: string;
}

export function enviarPix(dados: DadosEnvioPix) {
  return requisitar<EnvioPix>("v2", "/pix/send", {
    metodo: "POST",
    corpo: dados,
  });
}

export interface SaldoLoja {
  disponivel: number;
  pendente: number;
  bloqueado: number;
}

function primeiroNumero(...candidatos: unknown[]) {
  for (const candidato of candidatos) {
    const numero = Number(candidato);
    if (candidato !== null && candidato !== undefined && !Number.isNaN(numero)) {
      return numero;
    }
  }
  return 0;
}

export async function consultarSaldoLoja(): Promise<SaldoLoja> {
  const loja = await requisitar<Record<string, any>>("v1", "/store/get");
  const saldo = (loja.balance ?? loja) as Record<string, unknown>;

  return {
    disponivel: paraReais(
      primeiroNumero(saldo.available, saldo.availableAmount, loja.available),
    ),
    pendente: paraReais(
      primeiroNumero(saldo.pending, saldo.waitingFunds, loja.pending),
    ),
    bloqueado: paraReais(primeiroNumero(saldo.blocked, loja.blocked)),
  };
}

/**
 * Converte o status da AbacatePay (PENDING, PAID, ...) para o vocabulário já
 * usado na coluna `pagamentos.status` e nas telas do sistema.
 */
export function statusInterno(statusAbacate?: string | null) {
  switch (String(statusAbacate ?? "").toUpperCase()) {
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
