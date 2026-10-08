import { Prisma } from "@/generated/prisma/client";
import { serializeDecimals } from "@/lib/serialize";

describe("serializeDecimals", () => {
  it("converte Decimals em objetos, listas e estruturas aninhadas", () => {
    const input = {
      valor: new Prisma.Decimal("12.34"),
      items: [{ detail: { valor: new Prisma.Decimal("0.99") } }],
    };

    expect(serializeDecimals(input)).toEqual({
      valor: 12.34,
      items: [{ detail: { valor: 0.99 } }],
    });
  });

  it("preserva Date sem transformá-lo em objeto de chaves", () => {
    const data = new Date("2026-01-15T12:00:00.000Z");
    const result = serializeDecimals({ created_at: data });

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.toISOString()).toBe("2026-01-15T12:00:00.000Z");
  });

  it("o resultado sobrevive a um JSON.stringify sem virar objeto vazio", () => {
    const raw = { valor: new Prisma.Decimal("7.77") };

    expect(JSON.stringify(raw)).not.toBe('{"valor":7.77}');
    expect(JSON.stringify(serializeDecimals(raw))).toBe('{"valor":7.77}');
  });
});
