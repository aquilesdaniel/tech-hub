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

// Fecha um pedido (order) na Pagar.me com o status informado, impedindo que novas
// cobranças sejam adicionadas a ele. Usado para cancelar um Pix ainda pendente.
export async function fecharPedido(
  orderId: string,
  status: "canceled" | "paid" = "canceled",
) {
  return pagarmeFetch(`/orders/${orderId}/closed`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
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

export interface DadosBancariosRecebedor {
  holderName: string;
  holderDocument: string;
  bank: string;
  branchNumber: string;
  branchCheckDigit?: string;
  accountNumber: string;
  accountCheckDigit: string;
  tipoConta: "checking" | "savings";
}

function serializarContaBancaria(conta: DadosBancariosRecebedor) {
  return {
    holder_name: conta.holderName,
    holder_type: "individual",
    holder_document: conta.holderDocument,
    bank: conta.bank,
    branch_number: conta.branchNumber,
    branch_check_digit: conta.branchCheckDigit || undefined,
    account_number: conta.accountNumber,
    account_check_digit: conta.accountCheckDigit,
    type: conta.tipoConta,
  };
}

export interface EnderecoRecebedor {
  street: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  complementary?: string;
  referencePoint?: string;
}

export interface RegisterInformationParams {
  email: string;
  document: string;
  name: string;
  birthdate: string;
  monthlyIncome: number;
  professionalOccupation: string;
  telefone: { areaCode: string; number: string };
  endereco: EnderecoRecebedor;
}

function serializarRegisterInformation(info: RegisterInformationParams) {
  return {
    email: info.email,
    document: info.document,
    type: "individual",
    name: info.name,
    birthdate: info.birthdate,
    monthly_income: info.monthlyIncome,
    professional_occupation: info.professionalOccupation,
    phone_numbers: [
      {
        ddd: info.telefone.areaCode,
        number: info.telefone.number,
        type: "mobile",
      },
    ],
    address: {
      street: info.endereco.street,
      street_number: info.endereco.streetNumber,
      neighborhood: info.endereco.neighborhood,
      city: info.endereco.city,
      state: info.endereco.state,
      zip_code: info.endereco.zipCode,
      complementary: info.endereco.complementary || "",
      reference_point: info.endereco.referencePoint || "",
    },
  };
}

export interface CriarRecebedorParams {
  code: string;
  registerInformation: RegisterInformationParams;
  bankAccount: DadosBancariosRecebedor;
  observacao?: string;
}

// Cria um recebedor (conta que recebe e saca valores). Retorna o objeto
// "recipient" da Pagar.me, com o id que deve ser salvo em colaboradores.recipient_id.
export async function criarRecebedor(params: CriarRecebedorParams) {
  return pagarmeFetch("/recipients", {
    method: "POST",
    body: JSON.stringify({
      register_information: serializarRegisterInformation(
        params.registerInformation,
      ),
      default_bank_account: serializarContaBancaria(params.bankAccount),
      code: params.code,
      metadata: params.observacao
        ? { observation: params.observacao }
        : undefined,
    }),
  });
}

// Busca os dados cadastrais atuais de um recebedor já existente.
export async function obterRecebedor(recipientId: string) {
  return pagarmeFetch(`/recipients/${recipientId}`, { method: "GET" });
}

export interface AtualizarRecebedorParams {
  registerInformation: RegisterInformationParams;
  observacao?: string;
}

// Atualiza os dados cadastrais de um recebedor já existente.
export async function atualizarRecebedor(
  recipientId: string,
  params: AtualizarRecebedorParams,
) {
  return pagarmeFetch(`/recipients/${recipientId}`, {
    method: "PUT",
    body: JSON.stringify({
      register_information: serializarRegisterInformation(
        params.registerInformation,
      ),
      metadata: params.observacao
        ? { observation: params.observacao }
        : undefined,
    }),
  });
}

// Atualiza apenas a conta bancária padrão de um recebedor já existente.
export async function atualizarContaBancariaRecebedor(
  recipientId: string,
  bankAccount: DadosBancariosRecebedor,
) {
  return pagarmeFetch(`/recipients/${recipientId}/default-bank-account`, {
    method: "PATCH",
    body: JSON.stringify({
      bank_account: serializarContaBancaria(bankAccount),
    }),
  });
}

export interface CriarTransferenciaParams {
  recipientId: string;
  valorEmCentavos: number;
  observacao?: string;
}

// Solicita o saque (transferência) do saldo disponível de um recebedor para a conta bancária cadastrada.
export async function criarTransferencia(params: CriarTransferenciaParams) {
  return pagarmeFetch("/transfers", {
    method: "POST",
    body: JSON.stringify({
      amount: params.valorEmCentavos,
      recipient_id: params.recipientId,
      metadata: params.observacao
        ? { observation: params.observacao }
        : undefined,
    }),
  });
}

// Consulta o saldo (disponível, aguardando fundos e já transferido) de um recebedor.
export async function consultarSaldoRecebedor(recipientId: string) {
  return pagarmeFetch(`/recipients/${recipientId}/balance`, {
    method: "GET",
  });
}
