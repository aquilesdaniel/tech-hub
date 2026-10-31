/**
 * @jest-environment node
 */

import {
  DELETE as deleteCertification,
  PATCH as patchCertification,
} from "@/app/api/certificacoes/[id]/route";
import { PATCH as patchEmployee } from "@/app/api/colaboradores/[id]/route";
import { PATCH as patchDebt } from "@/app/api/salgados/dividas/[id]/route";
import { POST as requestWithdrawal } from "@/app/api/salgados/transferencias/route";
import { sendPix } from "@/lib/abacatepay";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/session";
import { NextRequest } from "next/server";

process.env.SESSION_SECRET = "segredo-de-teste";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

jest.mock("@/lib/permissions", () => ({
  isAdmin: jest.fn(async (id: number) => id === 1),
}));

jest.mock("@/lib/abacatepay", () => ({
  ...jest.requireActual("@/lib/abacatepay"),
  sendPix: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    colaboradores: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    certificacoes: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const ADMIN = 1;
const AQUILES = 3;
const MARIA = 4;

const employeeUpdate = prisma.colaboradores.update as unknown as jest.Mock;
const employeeFind = prisma.colaboradores.findUnique as unknown as jest.Mock;
const certificationFind = prisma.certificacoes
  .findUnique as unknown as jest.Mock;
const certificationUpdate = prisma.certificacoes.update as unknown as jest.Mock;
const certificationDelete = prisma.certificacoes.delete as unknown as jest.Mock;
const transaction = prisma.$transaction as unknown as jest.Mock;

function request(
  path: string,
  method: string,
  { as, cookie, body }: { as?: number; cookie?: string; body?: unknown } = {},
) {
  const session = cookie ?? (as ? createSessionToken(as) : undefined);
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: session ? { cookie: `session=${session}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function params(id: number) {
  return { params: Promise.resolve({ id: String(id) }) };
}

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("IDOR: cadastro de colaborador (PATCH /api/colaboradores/[id])", () => {
  const hijack = { email: "atacante@evil.com", document: "000.000.000-00" };

  it("sem sessão: 401 e nada é alterado", async () => {
    const response = await patchEmployee(
      request(`/api/colaboradores/${MARIA}`, "PATCH", { body: hijack }),
      params(MARIA),
    );

    expect(response.status).toBe(401);
    expect(employeeUpdate).not.toHaveBeenCalled();
  });

  it("Aquiles logado troca o id da URL para o da Maria: 403", async () => {
    const response = await patchEmployee(
      request(`/api/colaboradores/${MARIA}`, "PATCH", {
        as: AQUILES,
        body: hijack,
      }),
      params(MARIA),
    );

    expect(response.status).toBe(403);
    expect(employeeUpdate).not.toHaveBeenCalled();
  });

  it("forjar o cookie trocando o id para o do admin invalida a assinatura: 401", async () => {
    const [, signature] = createSessionToken(AQUILES).split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ id: ADMIN, exp: Date.now() + 60_000 }),
    ).toString("base64url");

    const response = await patchEmployee(
      request(`/api/colaboradores/${MARIA}`, "PATCH", {
        cookie: `${forgedPayload}.${signature}`,
        body: hijack,
      }),
      params(MARIA),
    );

    expect(response.status).toBe(401);
    expect(employeeUpdate).not.toHaveBeenCalled();
  });

  it.each([
    ["o próprio dono", AQUILES],
    ["um admin", ADMIN],
  ])("%s consegue alterar o cadastro", async (_who, caller) => {
    employeeFind.mockResolvedValue({
      id: AQUILES,
      email: "aquiles@prisma.com",
    });
    employeeUpdate.mockResolvedValue({
      id: AQUILES,
      nome: "Aquiles Bastos",
      document: null,
      setores: null,
    });

    const response = await patchEmployee(
      request(`/api/colaboradores/${AQUILES}`, "PATCH", {
        as: caller,
        body: { nome: "Aquiles Bastos" },
      }),
      params(AQUILES),
    );

    expect(response.status).toBe(200);
    expect(employeeUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("IDOR: certificações (PATCH e DELETE /api/certificacoes/[id])", () => {
  beforeEach(() => {
    certificationFind.mockResolvedValue({ colaborador_id: MARIA });
  });

  it("Aquiles não edita a certificação da Maria", async () => {
    const response = await patchCertification(
      request("/api/certificacoes/50", "PATCH", {
        as: AQUILES,
        body: { nome: "Certificação falsa" },
      }),
      params(50),
    );

    expect(response.status).toBe(403);
    expect(certificationUpdate).not.toHaveBeenCalled();
  });

  it("Aquiles não apaga a certificação da Maria", async () => {
    const response = await deleteCertification(
      request("/api/certificacoes/50", "DELETE", { as: AQUILES }),
      params(50),
    );

    expect(response.status).toBe(403);
    expect(certificationDelete).not.toHaveBeenCalled();
  });

  it("a Maria apaga a própria certificação", async () => {
    certificationDelete.mockResolvedValue({});

    const response = await deleteCertification(
      request("/api/certificacoes/50", "DELETE", { as: MARIA }),
      params(50),
    );

    expect(response.status).toBe(200);
    expect(certificationDelete).toHaveBeenCalledWith({ where: { id: 50 } });
  });
});

describe("IDOR: dívidas (PATCH /api/salgados/dividas/[id])", () => {
  it("o devedor não consegue marcar a própria dívida como paga sem pagar", async () => {
    const response = await patchDebt(
      request("/api/salgados/dividas/101", "PATCH", {
        as: AQUILES,
        body: { pago: true },
      }),
      params(101),
    );

    expect(response.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("o admin consegue dar baixa na dívida", async () => {
    transaction.mockResolvedValue({ id: 101, pago: true });

    const response = await patchDebt(
      request("/api/salgados/dividas/101", "PATCH", {
        as: ADMIN,
        body: { pago: true },
      }),
      params(101),
    );

    expect(response.status).toBe(200);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

describe("IDOR: saque PIX (POST /api/salgados/transferencias)", () => {
  const withdrawal = {
    colaborador_id: ADMIN,
    amount: 500,
    pix_key: "atacante@evil.com",
    pix_key_type: "EMAIL",
  };

  it("mandar o colaborador_id do admin no corpo não autoriza o saque", async () => {
    const response = await requestWithdrawal(
      request("/api/salgados/transferencias", "POST", {
        as: AQUILES,
        body: withdrawal,
      }),
    );

    expect(response.status).toBe(403);
    expect(sendPix).not.toHaveBeenCalled();
  });

  it("sem sessão: 401 e nenhum PIX sai da conta", async () => {
    const response = await requestWithdrawal(
      request("/api/salgados/transferencias", "POST", { body: withdrawal }),
    );

    expect(response.status).toBe(401);
    expect(sendPix).not.toHaveBeenCalled();
  });
});
