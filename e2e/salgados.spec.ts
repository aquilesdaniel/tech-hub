import { expect, test } from "@playwright/test";
import { prepararSessao, USUARIO_ADMIN, USUARIO_COMUM } from "./support/app";

const tabelaPendentes = (page: import("@playwright/test").Page) =>
  page.getByRole("grid", { name: /dívidas pendentes/i });

test("lista as dívidas pendentes com colaborador, item e valor", async ({
  page,
}) => {
  await prepararSessao(page, USUARIO_COMUM);
  await page.goto("/salgados");

  await expect(
    page.getByRole("heading", { name: "Controle de Salgados" }),
  ).toBeVisible();

  const tabela = tabelaPendentes(page);
  await expect(tabela.getByText("Aquiles Bastos")).toBeVisible();
  await expect(tabela.getByText("Coxinha")).toBeVisible();
  await expect(tabela.getByText(/R\$\s?12,50/)).toBeVisible();
});

test("admin lança uma nova dívida e a API recebe os dados do formulário", async ({
  page,
}) => {
  let recebido: any = null;

  await prepararSessao(page, USUARIO_ADMIN, {
    "POST /api/salgados/dividas": ({ corpo }) => {
      recebido = corpo;
      return { status: 201, corpo: { id: 999 } };
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
    .poll(() => recebido, { message: "a API deveria ter recebido o POST" })
    .not.toBeNull();
  expect(recebido).toMatchObject({
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
  let chamou = false;

  await prepararSessao(page, USUARIO_ADMIN, {
    "POST /api/salgados/dividas": () => {
      chamou = true;
      return { status: 201, corpo: { id: 999 } };
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
  expect(chamou).toBe(false);
});
