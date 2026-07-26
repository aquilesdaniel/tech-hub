const PAGARME_API_BASE_URL = "https://api.pagar.me/core/v5";

export class PagarmeApiError extends Error {
  status: number;
  details: unknown;

  constructor(details: unknown, status: number) {
    super("Erro na API da Pagar.me");
    this.status = status;
    this.details = details;
  }
}

function getAuthHeader() {
  const secretKey = process.env.PAGARME_BASIC_AUTH_KEY;
  if (!secretKey) {
    throw new Error("PAGARME_BASIC_AUTH_KEY não está definido");
  }
  // A Pagar.me autentica via Basic Auth usando a secret key como usuário e senha vazia
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function pagarmeFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${PAGARME_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: getAuthHeader(),
      ...init.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new PagarmeApiError(data, response.status);
  }

  return data;
}

export interface CriarPedidoPixParams {
  itemCode: string;
  itemDescricao: string;
  valorEmCentavos: number;
  expiresInSegundos?: number;
  cliente: {
    nome: string;
    email?: string | null;
    documento: string;
    telefone: { countryCode: string; areaCode: string; number: string };
  };
}

// Cria um pedido com pagamento via Pix. Retorna o objeto "order" da Pagar.me,
// com order.charges[0].last_transaction contendo o qr_code gerado.
export async function criarPedidoPix(params: CriarPedidoPixParams) {
  return pagarmeFetch("/orders", {
    method: "POST",
    body: JSON.stringify({
      items: [
        {
          code: params.itemCode,
          amount: params.valorEmCentavos,
          description: params.itemDescricao,
          quantity: 1,
        },
      ],
      customer: {
        name: params.cliente.nome,
        email: params.cliente.email ?? undefined,
        type: "individual",
        document: params.cliente.documento,
        document_type: "CPF",
        phones: {
          mobile_phone: {
            country_code: params.cliente.telefone.countryCode,
            area_code: params.cliente.telefone.areaCode,
            number: params.cliente.telefone.number,
          },
        },
      },
      payments: [
        {
          payment_method: "pix",
          pix: { expires_in: params.expiresInSegundos ?? 86400 },
        },
      ],
    }),
  });
}
