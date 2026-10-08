export const SAFE_EMPLOYEE_SELECT = {
  id: true,
  setor_id: true,
  nome: true,
  email: true,
  tipo: true,
  departamento: true,
  cargo: true,
  data_admissao: true,
  status: true,
  admin_permanente: true,
  admin_temporario_ate: true,
  total_gasto_salgados: true,
  country_code: true,
  area_code: true,
  number: true,
  document: true,
  created_at: true,
  updated_at: true,
} as const;

function maskDocument(document: string | null): string | null {
  if (!document) return null;
  const digits = document.replace(/\D/g, "");
  const lastDigits = digits.slice(-2) || "**";
  return `***.***.***-${lastDigits}`;
}

export function sanitizeEmployee<T extends { document: string | null }>(
  employee: T,
) {
  const { document, ...rest } = employee;
  return {
    ...rest,
    has_document: Boolean(document),
    masked_document: maskDocument(document),
  };
}
