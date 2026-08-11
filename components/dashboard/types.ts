export type PontoMensal = {
  mes: string;
  label: string;
  lancado: number;
  quitado: number;
  certificacoes: number;
  emprestimos: number;
  devolucoes: number;
};

export type DashboardKpis = {
  valorEmAberto: number;
  valorQuitado: number;
  valorLancado: number;
  gastoTotalSalgados: number;
  dividasEmAberto: number;
  dividasQuitadas: number;
  taxaQuitacao: number;
  ticketMedio: number;
  emprestimosAtivos: number;
  emprestimosAtrasados: number;
  emprestimosNoPeriodo: number;
  devolucoesNoPeriodo: number;
  livrosTotal: number;
  livrosDisponiveis: number;
  taxaDisponibilidade: number;
  certificacoesNoPeriodo: number;
  certificacoesSenior: number;
  certificacoesVencendo: number;
  colaboradores: number;
  colaboradoresAtivos: number;
  setores: number;
};

export type DashboardDeltas = {
  valorQuitado: number | null;
  certificacoes: number | null;
  emprestimos: number | null;
  dividasLancadas: number | null;
};

export type LinhaRankingCertificacao = {
  id: number;
  nome: string;
  departamento: string;
  senior: number;
  outras: number;
  total: number;
};

export type LinhaRankingDevedor = {
  id: number;
  nome: string;
  departamento: string;
  valor: number;
  itens: number;
};

export type LinhaSetor = {
  setorId: number;
  setor: string;
  colaboradores: number;
  senior: number;
  outras: number;
  total: number;
  gasto: number;
};

export type LinhaGenero = {
  genero: string;
  total: number;
  emprestados: number;
};

export type LinhaItem = {
  item: string;
  quantidade: number;
  valor: number;
};

export type Setor = { id: number; nome: string };

export type DashboardData = {
  periodo: { meses: number; inicio: string | null; fim: string };
  filtros: { setorId: number | null; colaboradorId: number | null };
  setores: Setor[];
  kpis: DashboardKpis;
  deltas: DashboardDeltas;
  serieMensal: PontoMensal[];
  rankingCertificacoes: LinhaRankingCertificacao[];
  rankingDevedores: LinhaRankingDevedor[];
  porSetor: LinhaSetor[];
  generos: LinhaGenero[];
  itensPopulares: LinhaItem[];
  alertas: {
    emprestimosAtrasados: {
      id: number;
      livro: string;
      colaborador: string;
      diasAtraso: number;
      previsto: string;
    }[];
    certificacoesVencendo: {
      id: number;
      nome: string;
      tipo: string;
      colaborador: string;
      diasRestantes: number | null;
      vencimento: string | null;
    }[];
  };
};
