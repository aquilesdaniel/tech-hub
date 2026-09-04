import { sanitizarColaborador } from "@/lib/colaboradores";

const base = {
  id: 1,
  nome: "Aquiles Bastos",
  email: "aquiles@prismaproducao.com.br",
  document: "123.456.789-01",
};

describe("sanitizarColaborador", () => {
  it("remove o documento original e mascara o CPF", () => {
    const resultado = sanitizarColaborador(base);

    expect(resultado).not.toHaveProperty("document");
    expect(JSON.stringify(resultado)).not.toContain("123.456.789");
    expect(resultado.document_mascarado).toBe("***.***.***-01");
    expect(resultado.possui_documento).toBe(true);
  });

  it("mascara também quando o documento vem sem formatação", () => {
    expect(
      sanitizarColaborador({ ...base, document: "12345678901" })
        .document_mascarado,
    ).toBe("***.***.***-01");
  });

  it("não inventa máscara quando não há documento", () => {
    const resultado = sanitizarColaborador({ ...base, document: null });

    expect(resultado.possui_documento).toBe(false);
    expect(resultado.document_mascarado).toBeNull();
  });
});
