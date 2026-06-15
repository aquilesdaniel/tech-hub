import { neon } from "@neondatabase/serverless";

// Verificar se a variável de ambiente DATABASE_URL está definida
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definido");
}

// Criar conexão com o banco de dados Neon
const sql = neon(process.env.DATABASE_URL);

// Função para executar consultas SQL diretamente
// Usa a nova sintaxe sql.query e sempre devolve apenas `rows`
export async function query(text: string, params: any[] = []) {
  try {
    const result = await sql.query(text, params);
    return result as any[];
  } catch (error) {
    console.error("Erro na execução da query:", error);
    throw error;
  }
}

// Função utilitária para serializar dados com timestamps para JSON
export function serializeForJSON(data: any): any {
  if (Array.isArray(data)) {
    return data.map(serializeForJSON);
  }

  if (data && typeof data === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        serialized[key] = value.toISOString();
      } else if (
        key.includes("_at") ||
        key.includes("_date") ||
        key === "data_admissao" ||
        key === "data_emprestimo" ||
        key === "data_prevista_devolucao" ||
        key === "data_real_devolucao"
      ) {
        // Converter campos de data/timestamp para string
        serialized[key] = value
          ? new Date(value as string | number | Date).toISOString()
          : null;
      } else if (key === "valor" && value !== null && value !== undefined) {
        // Converter campo valor para número
        serialized[key] = parseFloat(value as string);
      } else if (value && typeof value === "object") {
        serialized[key] = serializeForJSON(value);
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }

  return data;
}

// Tipos TypeScript para as tabelas
// Rever tudo isso pois mudei muita coisa das tabelas
export interface Colaborador {
  id: number;
  setor_id?: number;
  nome: string;
  email: string;
  senha: string;
  tipo: "admin" | "user";
  departamento: string;
  cargo: string;
  data_admissao: Date;
  status: "ativo" | "inativo";
  admin_permanente: boolean;
  admin_temporario_ate: Date;
  total_gasto_salgados: number;
  country_code: string;
  area_code: string;
  number: string;
  document: string;
  created_at: Date;
  updated_at: Date;
}

export interface Setor {
  id: number;
  nome: string;
  descricao: string;
  total_colaboradores: number;
  responsavel?: string;
  created_at: string;
  updated_at: string;
}

export interface Divida {
  id: number;
  colaborador_id: number;
  colaborador_nome?: string;
  item: string;
  motivo: string;
  data_inicio: string;
  valor: number;
  pago: boolean;
  created_at: string;
  updated_at: string;
}

export interface Livro {
  id: number;
  titulo: string;
  autor: string;
  genero: string;
  isbn: string | null;
  disponivel: boolean;
  capa: string | null;
  created_at: string;
  updated_at: string;
}

export interface Emprestimo {
  id: number;
  livro_id: number;
  colaborador_id: number;
  livro_titulo?: string;
  livro_autor?: string;
  colaborador_nome?: string;
  data_emprestimo: string;
  data_prevista_devolucao: string;
  data_real_devolucao: string | null;
  status: "emprestado" | "devolvido" | "atrasado";
  created_at: string;
  updated_at: string;
}

export interface DayOff {
  id: number;
  colaborador_id: number;
  colaborador_nome?: string;
  motivo: string;
  data_liberacao: string;
  usado: boolean;
  created_at: string;
  updated_at: string;
}

export interface Certificacao {
  id: number;
  colaborador_id: number;
  colaborador_nome?: string;
  nome: string;
  tipo: string;
  instituicao: string;
  data_obtencao: string;
  data_vencimento?: string | null;
  url_credencial?: string | null;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
}
