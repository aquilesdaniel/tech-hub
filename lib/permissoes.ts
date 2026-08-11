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
