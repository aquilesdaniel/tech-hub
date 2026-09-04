/**
 * @jest-environment node
 */

import { POST } from "@/app/api/admin/usuarios/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    colaboradores: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const findFirst = prisma.colaboradores.findFirst as unknown as jest.Mock;
const findUnique = prisma.colaboradores.findUnique as unknown as jest.Mock;
const count = prisma.colaboradores.count as unknown as jest.Mock;
const update = prisma.colaboradores.update as unknown as jest.Mock;

const ADMIN = "chefe@prismaproducao.com.br";
const ALVO = {
  id: 7,
  nome: "Maria Souza",
  email: "maria@prismaproducao.com.br",
};

function autenticarComoAdminPermanente(ehPermanente = true) {
  findFirst.mockResolvedValue({ admin_permanente: ehPermanente });
}

function post(corpo: unknown) {
  return new NextRequest("http://localhost/api/admin/usuarios", {
    method: "POST",
    body: JSON.stringify(corpo),
  });
}

function amanha() {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  return data.toISOString().slice(0, 10);
}

function ontem() {
  const data = new Date();
  data.setDate(data.getDate() - 1);
  return data.toISOString().slice(0, 10);
}

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("POST /api/admin/usuarios", () => {
  it("nega quem não é admin permanente", async () => {
    autenticarComoAdminPermanente(false);

    const resposta = await POST(
      post({ colaborador_id: 7, admin_ate: amanha(), user_email: "ze@x.com" }),
    );

    expect(resposta.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("exige o colaborador_id", async () => {
    autenticarComoAdminPermanente();

    const resposta = await POST(
      post({ user_email: ADMIN, admin_ate: amanha() }),
    );

    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({
      error: "Campo obrigatório: colaborador_id",
    });
  });

  it("recusa data de expiração no passado", async () => {
    autenticarComoAdminPermanente();

    const resposta = await POST(
      post({ colaborador_id: 7, admin_ate: ontem(), user_email: ADMIN }),
    );

    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({
      error: "A data de expiração deve ser futura",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("impede o admin de alterar os próprios privilégios", async () => {
    autenticarComoAdminPermanente();
    findUnique.mockResolvedValue({
      ...ALVO,
      email: ADMIN,
      admin_permanente: true,
    });

    const resposta = await POST(
      post({ colaborador_id: 7, admin_ate: amanha(), user_email: ADMIN }),
    );

    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({
      error: "Você não pode alterar seus próprios privilégios de admin",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("impede rebaixar o último admin permanente", async () => {
    autenticarComoAdminPermanente();
    findUnique.mockResolvedValue({ ...ALVO, admin_permanente: true });
    count.mockResolvedValue(1);

    const resposta = await POST(
      post({ colaborador_id: 7, admin_ate: amanha(), user_email: ADMIN }),
    );

    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({
      error: "É necessário manter ao menos um admin permanente",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("promove a admin permanente", async () => {
    autenticarComoAdminPermanente();
    findUnique.mockResolvedValue({ ...ALVO, admin_permanente: false });
    update.mockResolvedValue({});

    const resposta = await POST(
      post({ colaborador_id: 7, admin_permanente: true, user_email: ADMIN }),
    );

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({
      message: "Maria Souza agora é admin permanente",
    });
    expect(update.mock.calls[0][0].data).toMatchObject({
      admin_permanente: true,
      admin_temporario_ate: null,
      tipo: "admin",
    });
  });
});
