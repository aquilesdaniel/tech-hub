import { prisma } from "@/lib/prisma";

export async function ehAdminPermanente(email?: string | null) {
  if (!email?.trim()) {
    return false;
  }

  const colaborador = await prisma.colaboradores.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { admin_permanente: true },
  });

  return colaborador?.admin_permanente === true;
}

export async function ehAdmin(colaboradorId?: number | null) {
  if (!Number.isFinite(Number(colaboradorId))) {
    return false;
  }

  const colaborador = await prisma.colaboradores.findUnique({
    where: { id: Number(colaboradorId) },
    select: { tipo: true, admin_permanente: true, admin_temporario_ate: true },
  });

  if (!colaborador) return false;
  if (colaborador.admin_permanente === true) return true;
  if (colaborador.tipo === "admin") return true;

  return Boolean(
    colaborador.admin_temporario_ate &&
      new Date(colaborador.admin_temporario_ate) >= new Date(),
  );
}
