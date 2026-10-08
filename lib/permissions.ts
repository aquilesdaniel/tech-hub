import { prisma } from "@/lib/prisma";

export async function isPermanentAdmin(email?: string | null) {
  if (!email?.trim()) {
    return false;
  }

  const employee = await prisma.colaboradores.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    select: { admin_permanente: true },
  });

  return employee?.admin_permanente === true;
}

export async function isAdmin(employeeId?: number | null) {
  if (!Number.isFinite(Number(employeeId))) {
    return false;
  }

  const employee = await prisma.colaboradores.findUnique({
    where: { id: Number(employeeId) },
    select: { tipo: true, admin_permanente: true, admin_temporario_ate: true },
  });

  if (!employee) return false;
  if (employee.admin_permanente === true) return true;
  if (employee.tipo === "admin") return true;

  return Boolean(
    employee.admin_temporario_ate &&
      new Date(employee.admin_temporario_ate) >= new Date(),
  );
}
