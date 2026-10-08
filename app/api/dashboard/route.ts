import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MONTH_ABBREVIATIONS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const EXPIRATION_ALERT_DAYS = 90;
const MS_PER_DAY = 86_400_000;

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTH_ABBREVIATIONS[Number(month) - 1]}/${year.slice(2)}`;
}

function startOfMonthUTC(reference: Date, monthOffset: number) {
  return new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth() + monthOffset,
      1,
    ),
  );
}

function toNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function accumulate<T>(
  rows: T[],
  key: (row: T) => string | null,
  value: (row: T) => number,
) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    if (k === null) continue;
    map.set(k, (map.get(k) ?? 0) + value(row));
  }
  return map;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const rawMonths = Number(params.get("months") ?? 6);
    const months = [0, 3, 6, 12, 24].includes(rawMonths) ? rawMonths : 6;

    const sectorParam = params.get("sectorId");
    const sectorId =
      sectorParam && sectorParam !== "all" ? Number(sectorParam) : null;

    const employeeParam = params.get("employeeId");
    const employeeId = employeeParam ? Number(employeeParam) : null;

    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );

    const start = months > 0 ? startOfMonthUTC(todayUTC, -(months - 1)) : null;
    const previousStart =
      months > 0 ? startOfMonthUTC(todayUTC, -(months * 2 - 1)) : null;

    const employeeFilter: { setor_id?: number; id?: number } = {};
    if (sectorId !== null) employeeFilter.setor_id = sectorId;
    if (employeeId !== null) employeeFilter.id = employeeId;
    const scope =
      Object.keys(employeeFilter).length > 0
        ? { colaboradores: employeeFilter }
        : {};

    const sincePrevious = previousStart ? { gte: previousStart } : undefined;

    const expirationLimit = new Date(
      todayUTC.getTime() + EXPIRATION_ALERT_DAYS * MS_PER_DAY,
    );

    const [
      windowDebts,
      openDebts,
      windowCertifications,
      expiringCertifications,
      windowLoans,
      openLoans,
      books,
      employees,
      sectors,
    ] = await Promise.all([
      prisma.dividas.findMany({
        where: {
          ...scope,
          ...(sincePrevious && { data_inicio: sincePrevious }),
        },
        select: {
          id: true,
          item: true,
          valor: true,
          pago: true,
          data_inicio: true,
          colaborador_id: true,
          colaboradores: { select: { nome: true, departamento: true } },
        },
      }),

      prisma.dividas.findMany({
        where: { ...scope, pago: { not: true } },
        select: {
          id: true,
          item: true,
          valor: true,
          data_inicio: true,
          colaborador_id: true,
          colaboradores: { select: { nome: true, departamento: true } },
        },
      }),
      prisma.certificacoes.findMany({
        where: {
          ...scope,
          ...(sincePrevious && { data_obtencao: sincePrevious }),
        },
        select: {
          id: true,
          nome: true,
          tipo: true,
          instituicao: true,
          data_obtencao: true,
          colaborador_id: true,
          colaboradores: {
            select: { nome: true, departamento: true, setor_id: true },
          },
        },
      }),
      prisma.certificacoes.findMany({
        where: {
          ...scope,
          data_vencimento: { gte: todayUTC, lte: expirationLimit },
        },
        orderBy: { data_vencimento: "asc" },
        select: {
          id: true,
          nome: true,
          tipo: true,
          data_vencimento: true,
          colaboradores: { select: { nome: true } },
        },
      }),
      prisma.emprestimos.findMany({
        where: {
          ...scope,
          ...(sincePrevious && { data_emprestimo: sincePrevious }),
        },
        select: {
          id: true,
          data_emprestimo: true,
          data_real_devolucao: true,
          livros: { select: { titulo: true, genero: true } },
        },
      }),

      prisma.emprestimos.findMany({
        where: { ...scope, status: "emprestado" },
        orderBy: { data_prevista_devolucao: "asc" },
        select: {
          id: true,
          data_emprestimo: true,
          data_prevista_devolucao: true,
          livros: { select: { titulo: true } },
          colaboradores: { select: { nome: true } },
        },
      }),
      prisma.livros.findMany({
        select: { id: true, genero: true, disponivel: true },
      }),
      prisma.colaboradores.findMany({
        where: employeeFilter,
        select: {
          id: true,
          nome: true,
          departamento: true,
          status: true,
          total_gasto_salgados: true,
          setores: { select: { id: true, nome: true } },
        },
      }),
      prisma.setores.findMany({
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
    ]);

    const windowMonths = months > 0 ? months : null;
    const windowKeys: string[] = [];
    if (windowMonths) {
      for (let i = windowMonths - 1; i >= 0; i--) {
        windowKeys.push(monthKey(startOfMonthUTC(todayUTC, -i)));
      }
    } else {
      const present = new Set<string>();
      for (const d of windowDebts) present.add(monthKey(d.data_inicio));
      for (const c of windowCertifications)
        present.add(monthKey(c.data_obtencao));
      for (const l of windowLoans) present.add(monthKey(l.data_emprestimo));
      windowKeys.push(...Array.from(present).sort());
    }

    const inWindow = (key: string) => !start || key >= monthKey(start);

    const issuedByMonth = accumulate(
      windowDebts,
      (d) => monthKey(d.data_inicio),
      (d) => toNumber(d.valor),
    );
    const settledByMonth = accumulate(
      windowDebts.filter((d) => d.pago === true),
      (d) => monthKey(d.data_inicio),
      (d) => toNumber(d.valor),
    );
    const certificationsByMonth = accumulate(
      windowCertifications,
      (c) => monthKey(c.data_obtencao),
      () => 1,
    );
    const loansByMonth = accumulate(
      windowLoans,
      (l) => monthKey(l.data_emprestimo),
      () => 1,
    );
    const returnsByMonth = accumulate(
      windowLoans,
      (l) => (l.data_real_devolucao ? monthKey(l.data_real_devolucao) : null),
      () => 1,
    );

    const monthlySeries = windowKeys.map((key) => ({
      month: key,
      label: monthLabel(key),
      issued: Math.round((issuedByMonth.get(key) ?? 0) * 100) / 100,
      settled: Math.round((settledByMonth.get(key) ?? 0) * 100) / 100,
      certifications: certificationsByMonth.get(key) ?? 0,
      loans: loansByMonth.get(key) ?? 0,
      returns: returnsByMonth.get(key) ?? 0,
    }));

    const currentDebts = windowDebts.filter((d) =>
      inWindow(monthKey(d.data_inicio)),
    );
    const previousDebts = windowDebts.filter(
      (d) => !inWindow(monthKey(d.data_inicio)),
    );
    const currentCertifications = windowCertifications.filter((c) =>
      inWindow(monthKey(c.data_obtencao)),
    );
    const previousCertifications = windowCertifications.filter(
      (c) => !inWindow(monthKey(c.data_obtencao)),
    );
    const currentLoans = windowLoans.filter((l) =>
      inWindow(monthKey(l.data_emprestimo)),
    );
    const previousLoans = windowLoans.filter(
      (l) => !inWindow(monthKey(l.data_emprestimo)),
    );

    const sumAmount = (rows: { valor: unknown }[]) =>
      rows.reduce((total, r) => total + toNumber(r.valor), 0);

    const settledAmount = sumAmount(
      currentDebts.filter((d) => d.pago === true),
    );
    const previousSettledAmount = sumAmount(
      previousDebts.filter((d) => d.pago === true),
    );
    const issuedAmount = sumAmount(currentDebts);
    const openAmount = sumAmount(openDebts);

    const overdue = openLoans.filter(
      (l) => l.data_prevista_devolucao.getTime() < todayUTC.getTime(),
    );

    const returnedInWindow = windowLoans.filter(
      (l) =>
        l.data_real_devolucao !== null &&
        inWindow(monthKey(l.data_real_devolucao)),
    );

    const availableBooks = books.filter((b) => b.disponivel === true).length;

    const totalSnackSpending = employees.reduce(
      (total, e) => total + toNumber(e.total_gasto_salgados),
      0,
    );

    const kpis = {
      openAmount,
      settledAmount,
      issuedAmount,
      totalSnackSpending,
      openDebts: openDebts.length,
      settledDebts: currentDebts.filter((d) => d.pago === true).length,
      settlementRate: issuedAmount > 0 ? (settledAmount / issuedAmount) * 100 : 0,
      averageTicket:
        currentDebts.length > 0 ? issuedAmount / currentDebts.length : 0,
      activeLoans: openLoans.length,
      overdueLoans: overdue.length,
      loansInPeriod: currentLoans.length,
      returnsInPeriod: returnedInWindow.length,
      totalBooks: books.length,
      availableBooks,
      availabilityRate:
        books.length > 0 ? (availableBooks / books.length) * 100 : 0,
      certificationsInPeriod: currentCertifications.length,
      seniorCertifications: currentCertifications.filter(
        (c) => c.tipo === "Certificação Senior",
      ).length,
      expiringCertifications: expiringCertifications.length,
      employees: employees.length,
      activeEmployees: employees.filter((e) => e.status === "ativo").length,
      sectors: sectors.length,
    };

    const deltas = {
      settledAmount: percentChange(settledAmount, previousSettledAmount),
      certifications: percentChange(
        currentCertifications.length,
        previousCertifications.length,
      ),
      loans: percentChange(currentLoans.length, previousLoans.length),
      issuedDebts: percentChange(currentDebts.length, previousDebts.length),
    };

    const byEmployee = new Map<
      number,
      {
        id: number;
        name: string;
        department: string;
        senior: number;
        others: number;
      }
    >();
    for (const cert of currentCertifications) {
      const entry = byEmployee.get(cert.colaborador_id) ?? {
        id: cert.colaborador_id,
        name: cert.colaboradores.nome,
        department: cert.colaboradores.departamento,
        senior: 0,
        others: 0,
      };
      if (cert.tipo === "Certificação Senior") entry.senior += 1;
      else entry.others += 1;
      byEmployee.set(cert.colaborador_id, entry);
    }
    const certificationRanking = Array.from(byEmployee.values())
      .map((e) => ({ ...e, total: e.senior + e.others }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
      .slice(0, 8);

    const debtors = new Map<
      number,
      {
        id: number;
        name: string;
        department: string;
        amount: number;
        items: number;
      }
    >();
    for (const debt of openDebts) {
      const entry = debtors.get(debt.colaborador_id) ?? {
        id: debt.colaborador_id,
        name: debt.colaboradores.nome,
        department: debt.colaboradores.departamento,
        amount: 0,
        items: 0,
      };
      entry.amount += toNumber(debt.valor);
      entry.items += 1;
      debtors.set(debt.colaborador_id, entry);
    }
    const debtorRanking = Array.from(debtors.values())
      .map((d) => ({ ...d, amount: Math.round(d.amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const certsBySector = new Map<
      number | null,
      { senior: number; others: number }
    >();
    for (const cert of currentCertifications) {
      const key = cert.colaboradores.setor_id ?? null;
      const entry = certsBySector.get(key) ?? { senior: 0, others: 0 };
      if (cert.tipo === "Certificação Senior") entry.senior += 1;
      else entry.others += 1;
      certsBySector.set(key, entry);
    }
    const bySector = sectors
      .map((sector) => {
        const cert = certsBySector.get(sector.id) ?? { senior: 0, others: 0 };
        const sectorEmployees = employees.filter(
          (e) => e.setores?.id === sector.id,
        );
        return {
          sectorId: sector.id,
          sector: sector.nome,
          employees: sectorEmployees.length,
          senior: cert.senior,
          others: cert.others,
          total: cert.senior + cert.others,
          spent:
            Math.round(
              sectorEmployees.reduce(
                (t, e) => t + toNumber(e.total_gasto_salgados),
                0,
              ) * 100,
            ) / 100,
        };
      })
      .filter((s) => s.employees > 0 || s.total > 0)
      .sort((a, b) => b.total - a.total || b.employees - a.employees);

    const genreMap = new Map<string, { total: number; loaned: number }>();
    for (const book of books) {
      const genre = book.genero?.trim() || "Sem gênero";
      const entry = genreMap.get(genre) ?? { total: 0, loaned: 0 };
      entry.total += 1;
      if (book.disponivel !== true) entry.loaned += 1;
      genreMap.set(genre, entry);
    }
    const genres = Array.from(genreMap.entries())
      .map(([genre, v]) => ({ genre, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const itemMap = new Map<string, { count: number; amount: number }>();
    for (const debt of currentDebts) {
      const entry = itemMap.get(debt.item) ?? { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += toNumber(debt.valor);
      itemMap.set(debt.item, entry);
    }
    const popularItems = Array.from(itemMap.entries())
      .map(([item, v]) => ({
        item,
        count: v.count,
        amount: Math.round(v.amount * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const daysSince = (date: Date) =>
      Math.round((todayUTC.getTime() - date.getTime()) / MS_PER_DAY);

    return NextResponse.json({
      period: {
        months,
        start: start?.toISOString() ?? null,
        end: todayUTC.toISOString(),
      },
      filters: { sectorId, employeeId },
      sectors,
      kpis,
      deltas,
      monthlySeries,
      certificationRanking,
      debtorRanking,
      bySector,
      genres,
      popularItems,
      alerts: {
        overdueLoans: overdue.slice(0, 8).map((l) => ({
          id: l.id,
          book: l.livros.titulo,
          employee: l.colaboradores.nome,
          daysOverdue: daysSince(l.data_prevista_devolucao),
          dueDate: l.data_prevista_devolucao.toISOString(),
        })),
        expiringCertifications: expiringCertifications
          .slice(0, 8)
          .map((c) => ({
            id: c.id,
            name: c.nome,
            type: c.tipo,
            employee: c.colaboradores.nome,
            daysRemaining: c.data_vencimento
              ? -daysSince(c.data_vencimento)
              : null,
            expiresAt: c.data_vencimento?.toISOString() ?? null,
          })),
      },
    });
  } catch (error) {
    console.error("Erro ao montar o dashboard:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
