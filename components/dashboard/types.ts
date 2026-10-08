export type MonthlyPoint = {
  month: string;
  label: string;
  issued: number;
  settled: number;
  certifications: number;
  loans: number;
  returns: number;
};

export type DashboardKpis = {
  openAmount: number;
  settledAmount: number;
  issuedAmount: number;
  totalSnackSpending: number;
  openDebts: number;
  settledDebts: number;
  settlementRate: number;
  averageTicket: number;
  activeLoans: number;
  overdueLoans: number;
  loansInPeriod: number;
  returnsInPeriod: number;
  totalBooks: number;
  availableBooks: number;
  availabilityRate: number;
  certificationsInPeriod: number;
  seniorCertifications: number;
  expiringCertifications: number;
  employees: number;
  activeEmployees: number;
  sectors: number;
};

export type DashboardDeltas = {
  settledAmount: number | null;
  certifications: number | null;
  loans: number | null;
  issuedDebts: number | null;
};

export type CertificationRankingRow = {
  id: number;
  name: string;
  department: string;
  senior: number;
  others: number;
  total: number;
};

export type DebtorRankingRow = {
  id: number;
  name: string;
  department: string;
  amount: number;
  items: number;
};

export type SectorRow = {
  sectorId: number;
  sector: string;
  employees: number;
  senior: number;
  others: number;
  total: number;
  spent: number;
};

export type GenreRow = {
  genre: string;
  total: number;
  loaned: number;
};

export type ItemRow = {
  item: string;
  count: number;
  amount: number;
};

export type Sector = { id: number; nome: string };

export type DashboardData = {
  period: { months: number; start: string | null; end: string };
  filters: { sectorId: number | null; employeeId: number | null };
  sectors: Sector[];
  kpis: DashboardKpis;
  deltas: DashboardDeltas;
  monthlySeries: MonthlyPoint[];
  certificationRanking: CertificationRankingRow[];
  debtorRanking: DebtorRankingRow[];
  bySector: SectorRow[];
  genres: GenreRow[];
  popularItems: ItemRow[];
  alerts: {
    overdueLoans: {
      id: number;
      book: string;
      employee: string;
      daysOverdue: number;
      dueDate: string;
    }[];
    expiringCertifications: {
      id: number;
      name: string;
      type: string;
      employee: string;
      daysRemaining: number | null;
      expiresAt: string | null;
    }[];
  };
};
