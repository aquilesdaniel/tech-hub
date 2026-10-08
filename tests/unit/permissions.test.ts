import { isAdmin, isPermanentAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    colaboradores: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const findFirst = prisma.colaboradores.findFirst as unknown as jest.Mock;
const findUnique = prisma.colaboradores.findUnique as unknown as jest.Mock;

const DAY = 24 * 60 * 60 * 1000;
const yesterday = new Date(Date.now() - DAY);
const tomorrow = new Date(Date.now() + DAY);

describe("isPermanentAdmin", () => {
  it("retorna false e não consulta o banco quando o email é vazio", async () => {
    await expect(isPermanentAdmin("   ")).resolves.toBe(false);
    await expect(isPermanentAdmin(null)).resolves.toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("busca o colaborador ignorando maiúsculas e espaços em volta", async () => {
    findFirst.mockResolvedValue({ admin_permanente: true });

    await expect(isPermanentAdmin(" Fulano@Prisma.com ")).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "Fulano@Prisma.com", mode: "insensitive" } },
      select: { admin_permanente: true },
    });
  });
});

describe("isAdmin", () => {
  it("admin permanente é admin mesmo com tipo 'user'", async () => {
    findUnique.mockResolvedValue({
      tipo: "user",
      admin_permanente: true,
      admin_temporario_ate: null,
    });

    await expect(isAdmin(1)).resolves.toBe(true);
  });

  it("admin temporário vale enquanto a data não expirou", async () => {
    findUnique.mockResolvedValue({
      tipo: "user",
      admin_permanente: false,
      admin_temporario_ate: tomorrow,
    });

    await expect(isAdmin(1)).resolves.toBe(true);
  });

  it("admin temporário expirado deixa de ser admin", async () => {
    findUnique.mockResolvedValue({
      tipo: "user",
      admin_permanente: false,
      admin_temporario_ate: yesterday,
    });

    await expect(isAdmin(1)).resolves.toBe(false);
  });

  it("usuário comum sem prazo temporário não é admin", async () => {
    findUnique.mockResolvedValue({
      tipo: "user",
      admin_permanente: false,
      admin_temporario_ate: null,
    });

    await expect(isAdmin(1)).resolves.toBe(false);
  });
});
