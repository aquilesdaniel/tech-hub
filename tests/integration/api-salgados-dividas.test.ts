/**
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/salgados/dividas/route";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    dividas: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const findMany = prisma.dividas.findMany as unknown as jest.Mock;
const create = prisma.dividas.create as unknown as jest.Mock;

function requisicaoGet(query = "") {
  return new NextRequest(`http://localhost/api/salgados/dividas${query}`);
}

function requisicaoPost(corpo: unknown) {
  return new NextRequest("http://localhost/api/salgados/dividas", {
    method: "POST",
    body: JSON.stringify(corpo),
  });
}

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/salgados/dividas", () => {
  it("filtra por dívidas em aberto quando pago=false", async () => {
    findMany.mockResolvedValue([]);

    await GET(requisicaoGet("?pago=false"));

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pago: false } }),
    );
  });

  it("achata o nome do colaborador e converte o Decimal do valor", async () => {
    findMany.mockResolvedValue([
      {
        id: 1,
        item: "Coxinha",
        valor: new Prisma.Decimal("12.50"),
        colaboradores: { nome: "Aquiles Bastos" },
      },
    ]);

    const resposta = await GET(requisicaoGet());

    expect(await resposta.json()).toEqual([
      {
        id: 1,
        item: "Coxinha",
        valor: 12.5,
        colaborador_nome: "Aquiles Bastos",
      },
    ]);
  });
});

describe("POST /api/salgados/dividas", () => {
  it("exige colaborador, item e valor", async () => {
    const resposta = await POST(requisicaoPost({ item: "Coxinha" }));

    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({
      error: "Colaborador, item e valor são obrigatórios",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("cria a dívida como não paga e converte o id do colaborador", async () => {
    create.mockResolvedValue({
      id: 10,
      colaborador_id: 4,
      item: "Coxinha",
      valor: new Prisma.Decimal("12.50"),
      pago: false,
    });

    const resposta = await POST(
      requisicaoPost({
        colaborador_id: "4",
        item: "Coxinha",
        motivo: "Aposta",
        valor: 12.5,
      }),
    );

    expect(resposta.status).toBe(201);
    expect(await resposta.json()).toMatchObject({ id: 10, valor: 12.5 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          colaborador_id: 4,
          item: "Coxinha",
          motivo: "Aposta",
          pago: false,
        }),
      }),
    );
  });
});
