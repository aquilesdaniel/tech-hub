/**
 * @jest-environment node
 */

import { PATCH } from "@/app/api/biblioteca/emprestimos/[id]/route";
import { POST } from "@/app/api/biblioteca/emprestimos/route";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
  prisma: { $transaction: jest.fn() },
}));

const transaction = prisma.$transaction as unknown as jest.Mock;

function criarTx() {
  return {
    livros: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    emprestimos: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

function usarTx(tx: ReturnType<typeof criarTx>) {
  transaction.mockImplementation((callback: (t: unknown) => unknown) =>
    callback(tx),
  );
  return tx;
}

function postEmprestimo(corpo: unknown) {
  return new NextRequest("http://localhost/api/biblioteca/emprestimos", {
    method: "POST",
    body: JSON.stringify(corpo),
  });
}

function patchEmprestimo(id: string, corpo: unknown) {
  return {
    req: new NextRequest(`http://localhost/api/biblioteca/emprestimos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(corpo),
    }),
    ctx: { params: Promise.resolve({ id }) },
  };
}

const CORPO_VALIDO = {
  livro_id: 5,
  colaborador_id: 3,
  data_emprestimo: "2026-01-10",
  data_prevista_devolucao: "2026-01-24",
};

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("POST /api/biblioteca/emprestimos", () => {
  it("recusa quando falta algum campo obrigatório", async () => {
    const resposta = await POST(
      postEmprestimo({ ...CORPO_VALIDO, livro_id: undefined }),
    );

    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({
      error: "Todos os campos são obrigatórios",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("bloqueia o empréstimo de um livro já emprestado", async () => {
    const tx = usarTx(criarTx());
    tx.livros.findUnique.mockResolvedValue({ disponivel: false });

    const resposta = await POST(postEmprestimo(CORPO_VALIDO));

    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({
      error: "Este livro não está disponível para empréstimo",
    });
    expect(tx.emprestimos.create).not.toHaveBeenCalled();
    expect(tx.livros.update).not.toHaveBeenCalled();
  });

  it("cria o empréstimo e marca o livro como indisponível", async () => {
    const tx = usarTx(criarTx());
    tx.livros.findUnique.mockResolvedValue({ disponivel: true });
    tx.emprestimos.create.mockResolvedValue({ id: 99, status: "emprestado" });

    const resposta = await POST(postEmprestimo(CORPO_VALIDO));

    expect(resposta.status).toBe(201);
    expect(tx.emprestimos.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        livro_id: 5,
        colaborador_id: 3,
        status: "emprestado",
      }),
    });
    expect(tx.livros.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ disponivel: false }),
      }),
    );
  });
});

describe("PATCH /api/biblioteca/emprestimos/[id]", () => {
  it("devolve o livro: fecha o empréstimo e libera o exemplar", async () => {
    const tx = usarTx(criarTx());
    tx.emprestimos.findUnique.mockResolvedValue({ livro_id: 5 });
    tx.emprestimos.update.mockResolvedValue({ id: 99, status: "devolvido" });

    const { req, ctx } = patchEmprestimo("99", {
      data_real_devolucao: "2026-01-20",
      status: "devolvido",
    });
    const resposta = await PATCH(req, ctx);

    expect(resposta.status).toBe(200);
    expect(tx.livros.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ disponivel: true }),
      }),
    );
  });

  it("responde 404 quando o empréstimo não existe", async () => {
    const tx = usarTx(criarTx());
    tx.emprestimos.findUnique.mockResolvedValue(null);

    const { req, ctx } = patchEmprestimo("404", { status: "devolvido" });
    const resposta = await PATCH(req, ctx);

    expect(resposta.status).toBe(404);
    expect(await resposta.json()).toEqual({
      error: "Empréstimo não encontrado",
    });
    expect(tx.emprestimos.update).not.toHaveBeenCalled();
  });
});
