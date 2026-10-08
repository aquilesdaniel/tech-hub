import { expect, test } from "@playwright/test";
import {
  ADMIN_USER,
  REGULAR_USER,
  response,
  setupSession,
} from "./support/app";

const pendingTable = (page: import("@playwright/test").Page) =>
  page.getByRole("grid", { name: /dívidas pendentes/i });

test("lista as dívidas pendentes com colaborador, item e valor", async ({
  page,
}) => {
  await setupSession(page, REGULAR_USER);
  await page.goto("/salgados");

  await expect(
    page.getByRole("heading", { name: "Controle de Salgados" }),
  ).toBeVisible();

  const table = pendingTable(page);
  await expect(table.getByText("Aquiles Bastos")).toBeVisible();
  await expect(table.getByText("Coxinha")).toBeVisible();
  await expect(table.getByText(/R\$\s?12,50/)).toBeVisible();
});

test("admin lança uma nova dívida e a API recebe os dados do formulário", async ({
  page,
}) => {
  let received: any = null;

  await setupSession(page, ADMIN_USER, {
    "POST /api/salgados/dividas": ({ body }) => {
      received = body;
      return response(201, { id: 999 });
    },
  });

  await page.goto("/salgados");
  await page.getByRole("button", { name: "Adicionar Dívida" }).click();

  const modal = page.getByRole("dialog", { name: "Nova Dívida de Salgado" });
  await expect(modal).toBeVisible();

  await modal.getByRole("button", { name: "Selecione um colaborador" }).click();
  await page.getByRole("option", { name: "Maria Souza" }).click();

  await modal.getByRole("button", { name: "Selecione o tipo" }).click();
  await page.getByRole("option", { name: "Salgado Avulso" }).click();

  await modal.getByLabel("Valor (R$)").fill("15,00");
  await modal.getByLabel("Motivo da Dívida").fill("Aposta perdida");

  await modal.getByRole("button", { name: "Adicionar Dívida" }).click();

  await expect
    .poll(() => received, { message: "a API deveria ter recebido o POST" })
    .not.toBeNull();
  expect(received).toMatchObject({
    colaborador_id: 4,
    item: "salgado",
    motivo: "Aposta perdida",
    valor: 15,
  });

  await expect(page.getByText("Dívida adicionada!")).toBeVisible();
});

test("o formulário barra o lançamento sem os campos obrigatórios", async ({
  page,
}) => {
  let called = false;

  await setupSession(page, ADMIN_USER, {
    "POST /api/salgados/dividas": () => {
      called = true;
      return response(201, { id: 999 });
    },
  });

  await page.goto("/salgados");
  await page.getByRole("button", { name: "Adicionar Dívida" }).click();

  const modal = page.getByRole("dialog", { name: "Nova Dívida de Salgado" });
  await modal.getByRole("button", { name: "Adicionar Dívida" }).click();

  await expect(
    page.getByText("Preencha todos os campos obrigatórios."),
  ).toBeVisible();
  await expect(modal).toBeVisible();
  expect(called).toBe(false);
});
