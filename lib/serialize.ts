import { Prisma } from "@/generated/prisma/client";

/** Converte recursivamente valores Prisma.Decimal em number para respostas JSON. */
export function serializeDecimals<T>(data: T): T {
  if (data instanceof Prisma.Decimal) {
    return data.toNumber() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeDecimals(item)) as unknown as T;
  }

  if (data instanceof Date) {
    return data;
  }

  if (data && typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeDecimals(value);
    }
    return result as T;
  }

  return data;
}
