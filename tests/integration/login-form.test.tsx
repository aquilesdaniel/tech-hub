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

const campoUsuario = () => screen.getByLabelText(/usuário sênior/i);
const campoSenha = () => screen.getByLabelText(/^senha$/i);
const botaoEntrar = () => screen.getByRole("button", { name: /entrar/i });

describe("Formulário de login", () => {
  it("bloqueia o envio e mostra aviso quando os campos estão vazios", async () => {
    const usuario = userEvent.setup();
    render(<LoginPage />);

    await usuario.click(botaoEntrar());

    expect(await screen.findByText("Preencha todos os campos")).toBeVisible();
    expect(login).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("envia as credenciais e navega para a home quando o login dá certo", async () => {
    login.mockResolvedValue(true);
    const usuario = userEvent.setup();
    render(<LoginPage />);

    await usuario.type(campoUsuario(), "aquiles@prismaproducao.com.br");
    await usuario.type(campoSenha(), "senha-correta");
    await usuario.click(botaoEntrar());

    expect(login).toHaveBeenCalledWith(
      "aquiles@prismaproducao.com.br",
      "senha-correta",
    );
    expect(push).toHaveBeenCalledWith("/");
    expect(screen.queryByText(/inválidos/i)).not.toBeInTheDocument();
  });

  it("mostra a mensagem de erro e permanece na tela quando o login falha", async () => {
    login.mockResolvedValue(false);
    const usuario = userEvent.setup();
    render(<LoginPage />);

    await usuario.type(campoUsuario(), "aquiles@prismaproducao.com.br");
    await usuario.type(campoSenha(), "senha-errada");
    await usuario.click(botaoEntrar());

    expect(
      await screen.findByText("Usuário ou senha inválidos no sistema Senior"),
    ).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });
});
