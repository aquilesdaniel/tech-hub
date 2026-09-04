import { expect, test } from "@playwright/test";
import {
  prepararSessao,
  resposta,
  USUARIO_ADMIN,
  USUARIO_COMUM,
} from "./support/app";

test("exibe o catálogo com a situação de cada livro", async ({ page }) => {
  await prepararSessao(page, USUARIO_COMUM);
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
  let emprestimo: any = null;
  let atualizacaoDoLivro: any = null;

  await prepararSessao(page, USUARIO_ADMIN, {
    "POST /api/biblioteca/emprestimos": ({ corpo }) => {
      emprestimo = corpo;
      return resposta(201, { id: 502 });
    },
    "PATCH /api/biblioteca/livros/1": ({ corpo }) => {
      atualizacaoDoLivro = corpo;
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

  await expect.poll(() => emprestimo).not.toBeNull();
  expect(emprestimo.livro_id).toBe(1);
  expect(emprestimo.colaborador_id).toBe(4);
  expect(
    new Date(emprestimo.data_prevista_devolucao).getTime(),
  ).toBeGreaterThan(new Date(emprestimo.data_emprestimo).getTime());

  await expect.poll(() => atualizacaoDoLivro).not.toBeNull();
  expect(atualizacaoDoLivro.disponivel).toBe(false);
});

test("devolver um livro pede confirmação antes de liberar o exemplar", async ({
  page,
}) => {
  let devolucao: any = null;
  let liberado: any = null;

  await prepararSessao(page, USUARIO_ADMIN, {
    "PATCH /api/biblioteca/emprestimos/501": ({ corpo }) => {
      devolucao = corpo;
      return { id: 501, status: "devolvido" };
    },
    "PATCH /api/biblioteca/livros/2": ({ corpo }) => {
      liberado = corpo;
      return { id: 2, disponivel: true };
    },
  });

  await page.goto("/biblioteca");
  await page.getByRole("tab", { name: "Empréstimos Ativos" }).click();
  await page.getByRole("button", { name: "Devolver livro" }).first().click();

  const confirmacao = page.getByRole("alertdialog");
  await expect(confirmacao).toBeVisible();

  expect(devolucao).toBeNull();

  await confirmacao.getByRole("button", { name: "Devolver" }).click();

  await expect.poll(() => devolucao).not.toBeNull();
  expect(devolucao.status).toBe("devolvido");

  await expect.poll(() => liberado).not.toBeNull();
  expect(liberado.disponivel).toBe(true);
});
