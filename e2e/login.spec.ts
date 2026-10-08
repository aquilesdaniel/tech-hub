import { expect, test } from "@playwright/test";
import { mockApi, REGULAR_USER, response } from "./support/app";

const PASSWORD = "senha-valida";

test.beforeEach(async ({ page }) => {
  await mockApi(page, {
    "POST /api/auth/senior": ({ body }) => {
      const { username, password } = body ?? {};

      if (username === REGULAR_USER.email && password === PASSWORD) {
        return { user: REGULAR_USER, message: "Login realizado com sucesso" };
      }

      return response(401, { error: "Credenciais inválidas" });
    },
  });
});

test("visitante sem sessão é redirecionado da home para o login", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: /fazer login/i }),
  ).toBeVisible();
});

test("credencial inválida mantém o usuário na tela de login com erro", async ({
  page,
}) => {
  await page.goto("/login");

  await page.getByLabel(/usuário sênior/i).fill(REGULAR_USER.email);
  await page.getByLabel(/^senha$/i).fill("senha-errada");
  await page.getByRole("button", { name: /entrar/i }).click();

  await expect(
    page.getByText("Usuário ou senha inválidos no sistema Senior"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("login válido leva o usuário à home e exibe os módulos", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(/usuário sênior/i).fill(REGULAR_USER.email);
  await page.getByLabel(/^senha$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();

  await page.waitForURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /olá, aquiles/i }),
  ).toBeVisible();

  const modules = page.getByRole("region", { name: "Módulos do TechHub" });
  await expect(
    modules.getByRole("heading", { name: "Salgados" }),
  ).toBeVisible();

  await expect(
    modules.getByRole("heading", { name: "Administração" }),
  ).toHaveCount(0);
});
