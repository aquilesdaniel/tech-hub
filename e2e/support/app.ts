import type { Page, Route } from "@playwright/test";

export const USUARIO_COMUM = {
  id: 3,
  nome: "Aquiles Bastos",
  email: "aquiles@prismaproducao.com.br",
  tipo: "user",
  departamento: "Desenvolvimento",
  cargo: "Desenvolvedor",
  admin_permanente: false,
  admin_temporario_ate: null,
};

export const USUARIO_ADMIN = {
  ...USUARIO_COMUM,
  id: 1,
  nome: "Chefe Prisma",
  email: "chefe@prismaproducao.com.br",
  tipo: "admin",
  admin_permanente: true,
};

export async function entrarComo(page: Page, usuario: object) {
  await page.addInitScript((dados) => {
    window.localStorage.setItem("user", JSON.stringify(dados));
  }, usuario);
}

export type Contexto = {
  url: URL;
  metodo: string;
  corpo: any;
};

const ENVELOPE = "__respostaMock";

export type Envelope = {
  [ENVELOPE]: true;
  status: number;
  corpo?: unknown;
};

export function resposta(status: number, corpo?: unknown): Envelope {
  return { [ENVELOPE]: true, status, corpo };
}

export type Manipulador = (
  contexto: Contexto,
) => unknown | Promise<unknown> | Envelope;

export type Rotas = Record<string, Manipulador>;

export const COLABORADORES = [
  {
    id: 3,
    nome: "Aquiles Bastos",
    email: "aquiles@prismaproducao.com.br",
    departamento: "Desenvolvimento",
    tipo: "user",
    status: "ativo",
  },
  {
    id: 4,
    nome: "Maria Souza",
    email: "maria@prismaproducao.com.br",
    departamento: "Suporte",
    tipo: "user",
    status: "ativo",
  },
];

export const DIVIDAS_PENDENTES = [
  {
    id: 101,
    colaborador_id: 3,
    colaborador_nome: "Aquiles Bastos",
    item: "Coxinha",
    motivo: "Aposta",
    data_inicio: "2026-02-10T00:00:00.000Z",
    valor: 12.5,
    pago: false,
  },
  {
    id: 102,
    colaborador_id: 4,
    colaborador_nome: "Maria Souza",
    item: "Empada",
    motivo: "Café da tarde",
    data_inicio: "2026-02-12T00:00:00.000Z",
    valor: 8,
    pago: false,
  },
];

export const DIVIDAS_PAGAS = [
  {
    id: 90,
    colaborador_id: 3,
    colaborador_nome: "Aquiles Bastos",
    item: "Pastel",
    motivo: "Aposta",
    data_inicio: "2026-01-05T00:00:00.000Z",
    valor: 20,
    pago: true,
  },
];

export const LIVROS = [
  {
    id: 1,
    titulo: "Clean Code",
    autor: "Robert C. Martin",
    genero: "Tecnologia",
    isbn: "9780132350884",
    disponivel: true,
    capa: "/placeholder.svg",
  },
  {
    id: 2,
    titulo: "O Programador Pragmático",
    autor: "Andrew Hunt",
    genero: "Tecnologia",
    isbn: "9788577807260",
    disponivel: false,
    capa: "/placeholder.svg",
  },
];

export const EMPRESTIMOS_ATIVOS = [
  {
    id: 501,
    livro_id: 2,
    colaborador_id: 3,
    livro_titulo: "O Programador Pragmático",
    livro_autor: "Andrew Hunt",
    colaborador_nome: "Aquiles Bastos",
    data_emprestimo: "2026-02-01T00:00:00.000Z",
    data_prevista_devolucao: "2026-02-15T00:00:00.000Z",
    data_real_devolucao: null,
    status: "emprestado",
  },
];

export const CERTIFICACOES = [
  {
    id: 201,
    colaborador_id: 3,
    colaborador_nome: "Aquiles Bastos",
    nome: "AWS Solutions Architect",
    tipo: "Certificação Cloud",
    instituicao: "Amazon",
    data_obtencao: "2026-01-10T00:00:00.000Z",
    data_vencimento: "2028-01-10T00:00:00.000Z",
    url_credencial: null,
    observacoes: null,
  },
];

const KPIS_ZERADOS = {
  valorEmAberto: 20.5,
  valorQuitado: 20,
  valorLancado: 40.5,
  gastoTotalSalgados: 20,
  dividasEmAberto: 2,
  dividasQuitadas: 1,
  taxaQuitacao: 33,
  ticketMedio: 13.5,
  emprestimosAtivos: 1,
  emprestimosAtrasados: 0,
  emprestimosNoPeriodo: 1,
  devolucoesNoPeriodo: 0,
  livrosTotal: 2,
  livrosDisponiveis: 1,
  taxaDisponibilidade: 50,
  certificacoesNoPeriodo: 1,
  certificacoesSenior: 0,
  certificacoesVencendo: 0,
  colaboradores: 2,
  colaboradoresAtivos: 2,
  setores: 1,
};

export function respostasPadrao(): Rotas {
  return {
    "/api/colaboradores": () => COLABORADORES,

    "/api/dashboard": () => ({
      periodo: { meses: 0, inicio: null, fim: new Date().toISOString() },
      filtros: { setorId: null, colaboradorId: null },
      setores: [],
      kpis: KPIS_ZERADOS,
      deltas: {
        valorQuitado: null,
        certificacoes: null,
        emprestimos: null,
        dividasLancadas: null,
      },
      serieMensal: [],
      rankingCertificacoes: [],
      rankingDevedores: [],
      porSetor: [],
      generos: [],
      itensPopulares: [],
    }),

    "/api/salgados/saldo": () => ({
      disponivel: 150.75,
      pendente: 0,
      bloqueado: 0,
    }),

    "/api/salgados/dividas": ({ url, metodo }) => {
      if (metodo === "POST") return resposta(201, { id: 999 });
      if (url.searchParams.get("motivos_only") === "true")
        return ["Aposta", "Café da tarde"];

      const pagas = url.searchParams.get("pago") === "true";
      const data = pagas ? DIVIDAS_PAGAS : DIVIDAS_PENDENTES;
      return { data, total: data.length, page: 1, totalPages: 1 };
    },

    "/api/biblioteca/livros": ({ metodo }) =>
      metodo === "POST" ? resposta(201, { id: 3 }) : LIVROS,

    "/api/biblioteca/emprestimos": ({ url, metodo }) => {
      if (metodo === "POST") return resposta(201, { id: 502 });

      const ativos = url.searchParams.get("status") === "emprestado";
      const data = ativos ? EMPRESTIMOS_ATIVOS : EMPRESTIMOS_ATIVOS;
      return {
        data,
        total: data.length,
        page: 1,
        totalPages: 1,
        resumo: { total: 1, ativos: 1, atrasados: 0, devolvidos: 0 },
      };
    },

    "/api/certificacoes": ({ metodo }) => {
      if (metodo === "POST") return resposta(201, { message: "ok", id: 202 });

      return {
        data: CERTIFICACOES,
        total: CERTIFICACOES.length,
        page: 1,
        totalPages: 1,
        resumo: {
          total: 1,
          senior: 0,
          vencendo90: 0,
          vencidas: 0,
          colaboradoresCertificados: 1,
          instituicoes: 1,
        },
        tipos: ["Certificação Cloud"],
      };
    },

    "/api/ranking/colaboradores": () =>
      COLABORADORES.map((c) => ({
        ...c,
        total_certificacoes: c.id === 3 ? 1 : 0,
        certificacoes_senior: 0,
        outras_certificacoes: c.id === 3 ? 1 : 0,
        ultima_certificacao: c.id === 3 ? "2026-01-10T00:00:00.000Z" : null,
        tipos_certificacao: c.id === 3 ? { "Certificação Cloud": 1 } : {},
      })),

    "/api/ranking/estatisticas": () => ({
      total_colaboradores: 2,
      total_certificacoes: 1,
      media_certificacoes_por_colaborador: 0.5,
      colaborador_mais_certificacoes: "Aquiles Bastos",
      tipo_certificacao_mais_popular: "Certificação Cloud",
      crescimento_mensal: [],
    }),

    "/api/admin/setores": () => [
      { id: 1, nome: "Desenvolvimento", descricao: "Time de produto" },
    ],

    "/api/admin/usuarios": () => ({
      data: [],
      total: 0,
      page: 1,
      totalPages: 1,
      resumo: { admins: 1 },
    }),
  };
}

export async function mockarApi(page: Page, rotas: Rotas = {}) {
  const tabela: Rotas = { ...respostasPadrao(), ...rotas };

  await page.route("**/api/**", async (route: Route) => {
    const requisicao = route.request();
    const url = new URL(requisicao.url());
    const metodo = requisicao.method();

    const manipulador =
      tabela[`${metodo} ${url.pathname}`] ?? tabela[url.pathname];

    if (!manipulador) {
      await route.fulfill({
        status: 501,
        contentType: "application/json",
        body: JSON.stringify({
          error: `Rota não mockada no teste: ${metodo} ${url.pathname}`,
        }),
      });
      return;
    }

    let corpo: any = null;
    try {
      corpo = requisicao.postDataJSON();
    } catch {
      corpo = null;
    }

    const resultado = await manipulador({ url, metodo, corpo });
    const envelope =
      resultado && typeof resultado === "object" && ENVELOPE in resultado
        ? (resultado as Envelope)
        : { status: 200, corpo: resultado };

    await route.fulfill({
      status: envelope.status,
      contentType: "application/json",
      body: JSON.stringify(envelope.corpo ?? null),
    });
  });
}

export async function prepararSessao(
  page: Page,
  usuario: object = USUARIO_COMUM,
  rotas: Rotas = {},
) {
  await entrarComo(page, usuario);
  await mockarApi(page, rotas);
}
