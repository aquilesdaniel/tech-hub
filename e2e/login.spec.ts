import { expect, test } from "@playwright/test";
import { mockarApi, resposta, USUARIO_COMUM } from "./support/app";

const SENHA = "senha-valida";

test.beforeEach(async ({ page }) => {
  await mockarApi(page, {
    "POST /api/auth/senior": ({ corpo }) => {
      const { username, password } = corpo ?? {};

      if (username === USUARIO_COMUM.email && password === SENHA) {
        return { user: USUARIO_COMUM, message: "Login realizado com sucesso" };
      }

      return resposta(401, { error: "Credenciais inválidas" });
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

  await page.getByLabel(/usuário sênior/i).fill(USUARIO_COMUM.email);
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
  await page.getByLabel(/usuário sênior/i).fill(USUARIO_COMUM.email);
  await page.getByLabel(/^senha$/i).fill(SENHA);
  await page.getByRole("button", { name: /entrar/i }).click();

  await page.waitForURL(/\/$/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /olá, aquiles/i }),
  ).toBeVisible();

  const modulos = page.getByRole("region", { name: "Módulos do TechHub" });
  await expect(
    modulos.getByRole("heading", { name: "Salgados" }),
  ).toBeVisible();

  await expect(
    modulos.getByRole("heading", { name: "Administração" }),
  ).toHaveCount(0);
});
