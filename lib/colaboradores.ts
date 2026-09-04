export const COLABORADOR_SELECT_SEGURO = {
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

function mascherarDocumento(document: string | null): string | null {
  if (!document) return null;
  const digitos = document.replace(/\D/g, "");
  const ultimosDigitos = digitos.slice(-2) || "**";
  return `***.***.***-${ultimosDigitos}`;
}

export function sanitizarColaborador<T extends { document: string | null }>(
  colaborador: T,
) {
  const { document, ...resto } = colaborador;
  return {
    ...resto,
    possui_documento: Boolean(document),
    document_mascarado: mascherarDocumento(document),
  };
}
