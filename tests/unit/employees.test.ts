import { sanitizeEmployee } from "@/lib/employees";

const base = {
  id: 1,
  nome: "Aquiles Bastos",
  email: "aquiles@prismaproducao.com.br",
  document: "123.456.789-01",
};

describe("sanitizeEmployee", () => {
  it("remove o documento original e mascara o CPF", () => {
    const result = sanitizeEmployee(base);

    expect(result).not.toHaveProperty("document");
    expect(JSON.stringify(result)).not.toContain("123.456.789");
    expect(result.masked_document).toBe("***.***.***-01");
    expect(result.has_document).toBe(true);
  });

  it("mascara também quando o documento vem sem formatação", () => {
    expect(
      sanitizeEmployee({ ...base, document: "12345678901" })
        .masked_document,
    ).toBe("***.***.***-01");
  });

  it("não inventa máscara quando não há documento", () => {
    const result = sanitizeEmployee({ ...base, document: null });

    expect(result.has_document).toBe(false);
    expect(result.masked_document).toBeNull();
  });
});
