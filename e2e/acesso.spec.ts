import { expect, test } from "@playwright/test";
import { prepararSessao, USUARIO_ADMIN, USUARIO_COMUM } from "./support/app";

const modulos = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Módulos do TechHub" });

test("o módulo Administração só aparece para admin", async ({ page }) => {
  await prepararSessao(page, USUARIO_COMUM);
  await page.goto("/");

  await expect(
    modulos(page).getByRole("heading", { name: "Salgados" }),
  ).toBeVisible();
  await expect(
    modulos(page).getByRole("heading", { name: "Administração" }),
  ).toHaveCount(0);
});

test("usuário comum que tenta abrir /admin é devolvido para a home", async ({
  page,
}) => {
  await prepararSessao(page, USUARIO_COMUM);
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Painel Administrativo" }),
  ).toHaveCount(0);
});

test("admin acessa o painel administrativo", async ({ page }) => {
  await prepararSessao(page, USUARIO_ADMIN);
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Painel Administrativo" }),
  ).toBeVisible();
});
