import { aplicarPagamentoConfirmado } from "@/lib/pagamentos";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/abacatepay", () => ({
  consultarCobrancaPix: jest.fn(),
  statusInterno: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pagamentos: { findFirst: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const transaction = prisma.$transaction as unknown as jest.Mock;

function criarTx() {
  return {
    pagamentos: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    dividas: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    colaboradores: { update: jest.fn().mockResolvedValue({}) },
  };
}

function usarTx(tx: ReturnType<typeof criarTx>) {
  transaction.mockImplementation((callback: (t: unknown) => unknown) =>
    callback(tx),
  );
  return tx;
}

describe("aplicarPagamentoConfirmado", () => {
  it("quita a dívida e acumula o valor no total gasto do colaborador", async () => {
    const tx = usarTx(criarTx());
    tx.pagamentos.findUnique.mockResolvedValue({
      id: 51,
      divida_id: 12,
      status: "pending",
    });
    tx.dividas.findUnique.mockResolvedValue({
      id: 12,
      pago: false,
      valor: 20,
      colaborador_id: 3,
    });

    const resultado = await aplicarPagamentoConfirmado(51);

    expect(resultado).toEqual({
      encontrado: true,
      atualizado: true,
      divida_id: 12,
      status: "paid",
    });
    expect(tx.dividas.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 12 },
        data: expect.objectContaining({ pago: true }),
      }),
    );
    expect(tx.colaboradores.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        data: expect.objectContaining({
          total_gasto_salgados: { increment: 20 },
        }),
      }),
    );
  });

  it("é idempotente: não reprocessa um pagamento já pago", async () => {
    const tx = usarTx(criarTx());
    tx.pagamentos.findUnique.mockResolvedValue({
      id: 51,
      divida_id: 12,
      status: "paid",
    });

    await expect(aplicarPagamentoConfirmado(51)).resolves.toEqual({
      encontrado: true,
      atualizado: false,
      divida_id: 12,
      status: "paid",
    });

    expect(tx.pagamentos.update).not.toHaveBeenCalled();
    expect(tx.dividas.update).not.toHaveBeenCalled();
    expect(tx.colaboradores.update).not.toHaveBeenCalled();
  });

  it("não soma o valor duas vezes quando a dívida já estava quitada", async () => {
    const tx = usarTx(criarTx());
    tx.pagamentos.findUnique.mockResolvedValue({
      id: 51,
      divida_id: 12,
      status: "pending",
    });
    tx.dividas.findUnique.mockResolvedValue({
      id: 12,
      pago: true,
      valor: 20,
      colaborador_id: 3,
    });

    const resultado = await aplicarPagamentoConfirmado(51);

    expect(resultado.status).toBe("paid");
    expect(tx.pagamentos.update).toHaveBeenCalled();
    expect(tx.dividas.update).not.toHaveBeenCalled();
    expect(tx.colaboradores.update).not.toHaveBeenCalled();
  });
});
