import type { Page, Route } from "@playwright/test";

export const REGULAR_USER = {
  id: 3,
  nome: "Aquiles Bastos",
  email: "aquiles@prismaproducao.com.br",
  tipo: "user",
  departamento: "Desenvolvimento",
  cargo: "Desenvolvedor",
  admin_permanente: false,
  admin_temporario_ate: null,
};

export const ADMIN_USER = {
  ...REGULAR_USER,
  id: 1,
  nome: "Chefe Prisma",
  email: "chefe@prismaproducao.com.br",
  tipo: "admin",
  admin_permanente: true,
};

export async function signInAs(page: Page, user: object) {
  await page.addInitScript((data) => {
    window.localStorage.setItem("user", JSON.stringify(data));
  }, user);
}

export type RequestContext = {
  url: URL;
  method: string;
  body: any;
};

const ENVELOPE = "__mockResponse";

export type Envelope = {
  [ENVELOPE]: true;
  status: number;
  body?: unknown;
};

export function response(status: number, body?: unknown): Envelope {
  return { [ENVELOPE]: true, status, body };
}

export type Handler = (
  context: RequestContext,
) => unknown | Promise<unknown> | Envelope;

export type Routes = Record<string, Handler>;

export const EMPLOYEES = [
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

export const PENDING_DEBTS = [
  {
    id: 101,
    colaborador_id: 3,
    employee_name: "Aquiles Bastos",
    item: "Coxinha",
    motivo: "Aposta",
    data_inicio: "2026-02-10T00:00:00.000Z",
    valor: 12.5,
    pago: false,
  },
  {
    id: 102,
    colaborador_id: 4,
    employee_name: "Maria Souza",
    item: "Empada",
    motivo: "Café da tarde",
    data_inicio: "2026-02-12T00:00:00.000Z",
    valor: 8,
    pago: false,
  },
];

export const PAID_DEBTS = [
  {
    id: 90,
    colaborador_id: 3,
    employee_name: "Aquiles Bastos",
    item: "Pastel",
    motivo: "Aposta",
    data_inicio: "2026-01-05T00:00:00.000Z",
    valor: 20,
    pago: true,
  },
];

export const BOOKS = [
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

export const ACTIVE_LOANS = [
  {
    id: 501,
    livro_id: 2,
    colaborador_id: 3,
    book_title: "O Programador Pragmático",
    book_author: "Andrew Hunt",
    employee_name: "Aquiles Bastos",
    data_emprestimo: "2026-02-01T00:00:00.000Z",
    data_prevista_devolucao: "2026-02-15T00:00:00.000Z",
    data_real_devolucao: null,
    status: "emprestado",
  },
];

export const CERTIFICATIONS = [
  {
    id: 201,
    colaborador_id: 3,
    employee_name: "Aquiles Bastos",
    nome: "AWS Solutions Architect",
    tipo: "Certificação Cloud",
    instituicao: "Amazon",
    data_obtencao: "2026-01-10T00:00:00.000Z",
    data_vencimento: "2028-01-10T00:00:00.000Z",
    url_credencial: null,
    observacoes: null,
  },
];

const DEFAULT_KPIS = {
  openAmount: 20.5,
  settledAmount: 20,
  issuedAmount: 40.5,
  totalSnackSpending: 20,
  openDebts: 2,
  settledDebts: 1,
  settlementRate: 33,
  averageTicket: 13.5,
  activeLoans: 1,
  overdueLoans: 0,
  loansInPeriod: 1,
  returnsInPeriod: 0,
  totalBooks: 2,
  availableBooks: 1,
  availabilityRate: 50,
  certificationsInPeriod: 1,
  seniorCertifications: 0,
  expiringCertifications: 0,
  employees: 2,
  activeEmployees: 2,
  sectors: 1,
};

export function defaultResponses(): Routes {
  return {
    "/api/colaboradores": () => EMPLOYEES,

    "/api/dashboard": () => ({
      period: { months: 0, start: null, end: new Date().toISOString() },
      filters: { sectorId: null, employeeId: null },
      sectors: [],
      kpis: DEFAULT_KPIS,
      deltas: {
        settledAmount: null,
        certifications: null,
        loans: null,
        issuedDebts: null,
      },
      monthlySeries: [],
      certificationRanking: [],
      debtorRanking: [],
      bySector: [],
      genres: [],
      popularItems: [],
      alerts: { overdueLoans: [], expiringCertifications: [] },
    }),

    "/api/salgados/saldo": () => ({
      available: 150.75,
      pending: 0,
      blocked: 0,
    }),

    "/api/salgados/dividas": ({ url, method }) => {
      if (method === "POST") return response(201, { id: 999 });
      if (url.searchParams.get("reasons_only") === "true")
        return ["Aposta", "Café da tarde"];

      const paid = url.searchParams.get("pago") === "true";
      const data = paid ? PAID_DEBTS : PENDING_DEBTS;
      return { data, total: data.length, page: 1, totalPages: 1 };
    },

    "/api/biblioteca/livros": ({ method }) =>
      method === "POST" ? response(201, { id: 3 }) : BOOKS,

    "/api/biblioteca/emprestimos": ({ url, method }) => {
      if (method === "POST") return response(201, { id: 502 });

      const active = url.searchParams.get("status") === "emprestado";
      const data = active ? ACTIVE_LOANS : ACTIVE_LOANS;
      return {
        data,
        total: data.length,
        page: 1,
        totalPages: 1,
        summary: { total: 1, active: 1, overdue: 0, returned: 0 },
      };
    },

    "/api/certificacoes": ({ method }) => {
      if (method === "POST") return response(201, { message: "ok", id: 202 });

      return {
        data: CERTIFICATIONS,
        total: CERTIFICATIONS.length,
        page: 1,
        totalPages: 1,
        summary: {
          total: 1,
          senior: 0,
          expiringIn90: 0,
          expired: 0,
          certifiedEmployees: 1,
          institutions: 1,
        },
        types: ["Certificação Cloud"],
      };
    },

    "/api/ranking/colaboradores": () =>
      EMPLOYEES.map((c) => ({
        ...c,
        total_certifications: c.id === 3 ? 1 : 0,
        senior_certifications: 0,
        other_certifications: c.id === 3 ? 1 : 0,
        last_certification: c.id === 3 ? "2026-01-10T00:00:00.000Z" : null,
        certification_types: c.id === 3 ? { "Certificação Cloud": 1 } : {},
      })),

    "/api/ranking/estatisticas": () => ({
      total_employees: 2,
      total_certifications: 1,
      average_certifications_per_employee: 0.5,
      top_certified_employee: "Aquiles Bastos",
      most_popular_certification_type: "Certificação Cloud",
      monthly_growth: [],
    }),

    "/api/admin/setores": () => [
      { id: 1, nome: "Desenvolvimento", descricao: "Time de produto" },
    ],

    "/api/admin/usuarios": () => ({
      data: [],
      total: 0,
      page: 1,
      totalPages: 1,
      summary: { admins: 1 },
    }),
  };
}

export async function mockApi(page: Page, routes: Routes = {}) {
  const routeTable: Routes = { ...defaultResponses(), ...routes };

  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    const handler =
      routeTable[`${method} ${url.pathname}`] ?? routeTable[url.pathname];

    if (!handler) {
      await route.fulfill({
        status: 501,
        contentType: "application/json",
        body: JSON.stringify({
          error: `Rota não mockada no teste: ${method} ${url.pathname}`,
        }),
      });
      return;
    }

    let body: any = null;
    try {
      body = request.postDataJSON();
    } catch {
      body = null;
    }

    const result = await handler({ url, method, body });
    const envelope =
      result && typeof result === "object" && ENVELOPE in result
        ? (result as Envelope)
        : { status: 200, body: result };

    await route.fulfill({
      status: envelope.status,
      contentType: "application/json",
      body: JSON.stringify(envelope.body ?? null),
    });
  });
}

export async function setupSession(
  page: Page,
  user: object = REGULAR_USER,
  routes: Routes = {},
) {
  await signInAs(page, user);
  await mockApi(page, routes);
}
