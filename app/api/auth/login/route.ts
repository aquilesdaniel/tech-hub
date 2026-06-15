import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Validação básica
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 },
      );
    }

    // Buscar usuário pelo email
    const users = await query(
      "SELECT id, nome, email, senha, tipo, departamento, cargo FROM colaboradores WHERE email = $1",
      [email],
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 },
      );
    }

    const user = users[0];

    // Para fins de demonstração, aceitar senha '123456' para todos os usuários
    // Em produção, usar bcrypt.compare(password, user.senha)
    const isPasswordValid = password === "123456";

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 },
      );
    }

    // Remover senha do objeto de resposta
    const { senha, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      message: "Login realizado com sucesso",
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro ao processar login" },
      { status: 500 },
    );
  }
}
