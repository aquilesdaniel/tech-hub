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
const TARGET = {
  id: 7,
  nome: "Maria Souza",
  email: "maria@prismaproducao.com.br",
};

function authenticateAsPermanentAdmin(isPermanent = true) {
  findFirst.mockResolvedValue({ admin_permanente: isPermanent });
}

function post(body: unknown) {
  return new NextRequest("http://localhost/api/admin/usuarios", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Data local (AAAA-MM-DD): a rota interpreta admin_until no fuso local, então
// toISOString (UTC) viraria o dia seguinte à noite no Brasil.
function localDay(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const tomorrow = () => localDay(1);
const yesterday = () => localDay(-1);

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("POST /api/admin/usuarios", () => {
  it("nega quem não é admin permanente", async () => {
    authenticateAsPermanentAdmin(false);

    const response = await POST(
      post({ colaborador_id: 7, admin_until: tomorrow(), user_email: "ze@x.com" }),
    );

    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("exige o colaborador_id", async () => {
    authenticateAsPermanentAdmin();

    const response = await POST(
      post({ user_email: ADMIN, admin_until: tomorrow() }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Campo obrigatório: colaborador_id",
    });
  });

  it("recusa data de expiração no passado", async () => {
    authenticateAsPermanentAdmin();

    const response = await POST(
      post({ colaborador_id: 7, admin_until: yesterday(), user_email: ADMIN }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "A data de expiração deve ser futura",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("impede o admin de alterar os próprios privilégios", async () => {
    authenticateAsPermanentAdmin();
    findUnique.mockResolvedValue({
      ...TARGET,
      email: ADMIN,
      admin_permanente: true,
    });

    const response = await POST(
      post({ colaborador_id: 7, admin_until: tomorrow(), user_email: ADMIN }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Você não pode alterar seus próprios privilégios de admin",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("impede rebaixar o último admin permanente", async () => {
    authenticateAsPermanentAdmin();
    findUnique.mockResolvedValue({ ...TARGET, admin_permanente: true });
    count.mockResolvedValue(1);

    const response = await POST(
      post({ colaborador_id: 7, admin_until: tomorrow(), user_email: ADMIN }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "É necessário manter ao menos um admin permanente",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("promove a admin permanente", async () => {
    authenticateAsPermanentAdmin();
    findUnique.mockResolvedValue({ ...TARGET, admin_permanente: false });
    update.mockResolvedValue({});

    const response = await POST(
      post({ colaborador_id: 7, admin_permanente: true, user_email: ADMIN }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      message: "Maria Souza agora é admin permanente",
    });
    expect(update.mock.calls[0][0].data).toMatchObject({
      admin_permanente: true,
      admin_temporario_ate: null,
      tipo: "admin",
    });
  });
});
