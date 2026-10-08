import { expect, test } from "@playwright/test";
import {
  ADMIN_USER,
  REGULAR_USER,
  response,
  setupSession,
} from "./support/app";

test("exibe o catálogo com a situação de cada livro", async ({ page }) => {
  await setupSession(page, REGULAR_USER);
  await page.goto("/biblioteca");

  await expect(page.getByRole("heading", { name: "Biblioteca" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clean Code" })).toBeVisible();
  await expect(page.getByText("Disponível")).toBeVisible();
  await expect(page.getByText("Emprestado")).toBeVisible();

  await expect(page.getByRole("button", { name: "Emprestar" })).toHaveCount(1);
});

test("empresta um livro e envia o pedido completo para a API", async ({
  page,
}) => {
  let loan: any = null;
  let bookUpdate: any = null;

  await setupSession(page, ADMIN_USER, {
    "POST /api/biblioteca/emprestimos": ({ body }) => {
      loan = body;
      return response(201, { id: 502 });
    },
    "PATCH /api/biblioteca/livros/1": ({ body }) => {
      bookUpdate = body;
      return { id: 1, disponivel: false };
    },
  });

  await page.goto("/biblioteca");
  await page.getByRole("button", { name: "Emprestar" }).click();

  const modal = page.getByRole("dialog", { name: "Emprestar Livro" });
  await expect(modal.getByText('Emprestar "Clean Code"')).toBeVisible();

  await modal.getByRole("button", { name: "Selecione um colaborador" }).click();
  await page.getByRole("option", { name: "Maria Souza" }).click();

  await modal.getByRole("button", { name: "Confirmar Empréstimo" }).click();

  await expect.poll(() => loan).not.toBeNull();
  expect(loan.livro_id).toBe(1);
  expect(loan.colaborador_id).toBe(4);
  expect(
    new Date(loan.data_prevista_devolucao).getTime(),
  ).toBeGreaterThan(new Date(loan.data_emprestimo).getTime());

  await expect.poll(() => bookUpdate).not.toBeNull();
  expect(bookUpdate.disponivel).toBe(false);
});

test("devolver um livro pede confirmação antes de liberar o exemplar", async ({
  page,
}) => {
  let returnRequest: any = null;
  let releasedBook: any = null;

  await setupSession(page, ADMIN_USER, {
    "PATCH /api/biblioteca/emprestimos/501": ({ body }) => {
      returnRequest = body;
      return { id: 501, status: "devolvido" };
    },
    "PATCH /api/biblioteca/livros/2": ({ body }) => {
      releasedBook = body;
      return { id: 2, disponivel: true };
    },
  });

  await page.goto("/biblioteca");
  await page.getByRole("tab", { name: "Empréstimos Ativos" }).click();
  await page.getByRole("button", { name: "Devolver livro" }).first().click();

  const confirmationDialog = page.getByRole("alertdialog");
  await expect(confirmationDialog).toBeVisible();

  expect(returnRequest).toBeNull();

  await confirmationDialog.getByRole("button", { name: "Devolver" }).click();

  await expect.poll(() => returnRequest).not.toBeNull();
  expect(returnRequest.status).toBe("devolvido");

  await expect.poll(() => releasedBook).not.toBeNull();
  expect(releasedBook.disponivel).toBe(true);
});
