/**
 * @jest-environment node
 */

import { POST as seniorLogin } from "@/app/api/auth/senior/route";
import { NextRequest } from "next/server";

process.env.SESSION_SECRET = "segredo-de-teste";

jest.mock("@/lib/prisma", () => ({
  prisma: { colaboradores: { findUnique: jest.fn() } },
}));

const seniorApi = jest.fn();

function attempt(ip: string, username = "aquiles", password = "chute") {
  return new NextRequest("http://localhost/api/auth/senior", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: JSON.stringify({ username, password }),
  });
}

async function bruteForce(ip: string, times: number, username?: string) {
  const statuses: number[] = [];
  for (let i = 0; i < times; i++) {
    statuses.push((await seniorLogin(attempt(ip, username, `senha${i}`))).status);
  }
  return statuses;
}

beforeEach(() => {
  global.fetch = seniorApi as unknown as typeof fetch;
  seniorApi.mockResolvedValue(new Response(null, { status: 401 }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Bots: força bruta no login (POST /api/auth/senior)", () => {
  it("um robô chutando senhas é barrado na 6ª tentativa com 429", async () => {
    const statuses = await bruteForce("200.1.1.1", 6);

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
  });

  it("o bloqueio informa quando tentar de novo e nem chega a chamar a Senior", async () => {
    await bruteForce("200.1.1.2", 5);
    seniorApi.mockClear();

    const blocked = await seniorLogin(attempt("200.1.1.2"));

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(seniorApi).not.toHaveBeenCalled();
  });

  it("um colega na mesma rede da empresa continua conseguindo logar", async () => {
    await bruteForce("200.1.1.3", 6, "aquiles");

    const colleague = await seniorLogin(attempt("200.1.1.3", "maria"));

    expect(colleague.status).toBe(401);
  });

  it("depois de 1 minuto as tentativas são liberadas", async () => {
    await bruteForce("200.1.1.4", 6);
    const oneMinuteLater = Date.now() + 61_000;
    jest.spyOn(Date, "now").mockReturnValue(oneMinuteLater);

    const response = await seniorLogin(attempt("200.1.1.4"));

    expect(response.status).toBe(401);
  });
});
