import { Prisma } from "@/generated/prisma/client";

/** True quando o Prisma não encontrou o registro alvo de um update/delete (P2025). */
export function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}
