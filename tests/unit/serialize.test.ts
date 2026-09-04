import { Prisma } from "@/generated/prisma/client";
import { serializeDecimals } from "@/lib/serialize";

describe("serializeDecimals", () => {
  it("converte Decimals em objetos, listas e estruturas aninhadas", () => {
    const entrada = {
      valor: new Prisma.Decimal("12.34"),
      itens: [{ detalhe: { valor: new Prisma.Decimal("0.99") } }],
    };

    expect(serializeDecimals(entrada)).toEqual({
      valor: 12.34,
      itens: [{ detalhe: { valor: 0.99 } }],
    });
  });

  it("preserva Date sem transformá-lo em objeto de chaves", () => {
    const data = new Date("2026-01-15T12:00:00.000Z");
    const resultado = serializeDecimals({ criado_em: data });

    expect(resultado.criado_em).toBeInstanceOf(Date);
    expect(resultado.criado_em.toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });

  it("o resultado sobrevive a um JSON.stringify sem virar objeto vazio", () => {
    const bruto = { valor: new Prisma.Decimal("7.77") };

    expect(JSON.stringify(bruto)).not.toBe('{"valor":7.77}');
    expect(JSON.stringify(serializeDecimals(bruto))).toBe('{"valor":7.77}');
  });
});
