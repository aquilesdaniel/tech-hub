import LoginPage from "@/app/login/page";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const login = jest.fn();
const push = jest.fn();

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    login,
    logout: jest.fn(),
    user: null,
    isLoading: false,
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn(), refresh: jest.fn() }),
}));

const usernameField = () => screen.getByLabelText(/usuário sênior/i);
const passwordField = () => screen.getByLabelText(/^senha$/i);
const signInButton = () => screen.getByRole("button", { name: /entrar/i });

describe("Formulário de login", () => {
  it("bloqueia o envio e mostra aviso quando os campos estão vazios", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(signInButton());

    expect(await screen.findByText("Preencha todos os campos")).toBeVisible();
    expect(login).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("envia as credenciais e navega para a home quando o login dá certo", async () => {
    login.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(usernameField(), "aquiles@prismaproducao.com.br");
    await user.type(passwordField(), "senha-correta");
    await user.click(signInButton());

    expect(login).toHaveBeenCalledWith(
      "aquiles@prismaproducao.com.br",
      "senha-correta",
    );
    expect(push).toHaveBeenCalledWith("/");
    expect(screen.queryByText(/inválidos/i)).not.toBeInTheDocument();
  });

  it("mostra a mensagem de erro e permanece na tela quando o login falha", async () => {
    login.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(usernameField(), "aquiles@prismaproducao.com.br");
    await user.type(passwordField(), "senha-errada");
    await user.click(signInButton());

    expect(
      await screen.findByText("Usuário ou senha inválidos no sistema Senior"),
    ).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });
});
