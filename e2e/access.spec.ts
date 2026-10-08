import { expect, test } from "@playwright/test";
import { ADMIN_USER, REGULAR_USER, setupSession } from "./support/app";

const modules = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Módulos do TechHub" });

test("o módulo Administração só aparece para admin", async ({ page }) => {
  await setupSession(page, REGULAR_USER);
  await page.goto("/");

  await expect(
    modules(page).getByRole("heading", { name: "Salgados" }),
  ).toBeVisible();
  await expect(
    modules(page).getByRole("heading", { name: "Administração" }),
  ).toHaveCount(0);
});

test("usuário comum que tenta abrir /admin é devolvido para a home", async ({
  page,
}) => {
  await setupSession(page, REGULAR_USER);
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Painel Administrativo" }),
  ).toHaveCount(0);
});

test("admin acessa o painel administrativo", async ({ page }) => {
  await setupSession(page, ADMIN_USER);
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Painel Administrativo" }),
  ).toBeVisible();
});
