import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMINS_PERMANENTES = [
  "weliton.ribeiro@prismainformatica.com.br",
  "edson@prismainformatica.com.br",
  "ivan@prismainformatica.com.br",
  "jose.xavier@prismainformatica.com.br",
  "everson.freire@prismainformatica.com.br",
];

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Validação básica
    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios" },
        { status: 400 },
      );
    }

    // Primeiro, fazer login na API do Senior para obter o token
    const loginResponse = await fetch(
      "https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform/authentication/actions/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          escopo: "string",
        }),
      },
    );

    if (!loginResponse.ok) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 },
      );
    }

    const loginData = await loginResponse.json();

    // Extrair o access_token do jsonToken
    let accessToken: string;
    try {
      const tokenData = JSON.parse(loginData.jsonToken);
      accessToken = tokenData.access_token;
    } catch (error) {
      console.error("Erro ao parsear token:", error);
      return NextResponse.json(
        { error: "Erro ao processar token de acesso" },
        { status: 500 },
      );
    }

    // Usar o access_token para obter dados do usuário
    const userResponse = await fetch(
      "https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform/user/queries/getUser",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          username,
          includePhoto: false,
        }),
      },
    );

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: "Erro ao obter dados do usuário" },
        { status: 500 },
      );
    }

    const userData = await userResponse.json();

    // Verificar se o colaborador já existe no banco local
    let localUser: {
      id: number;
      nome: string;
      email: string | null;
      tipo: string | null;
      departamento: string;
      cargo: string | null;
      admin_permanente: boolean | null;
      admin_temporario_ate: Date | null;
    };

    try {
      const existingUser = await prisma.colaboradores.findUnique({
        where: { email: userData.email },
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          departamento: true,
          cargo: true,
          admin_permanente: true,
          admin_temporario_ate: true,
        },
      });

      if (existingUser) {
        // Colaborador já existe - verificar status de admin
        localUser = existingUser;

        let isAdmin = false;

        // Verificar se é admin permanente
        if (
          ADMINS_PERMANENTES.includes(userData.email.toLowerCase()) ||
          localUser.admin_permanente
        ) {
          isAdmin = true;

          // Garantir que está marcado como admin permanente no banco
          if (!localUser.admin_permanente) {
            await prisma.colaboradores.update({
              where: { email: userData.email },
              data: {
                admin_permanente: true,
                tipo: "admin",
                updated_at: new Date(),
              },
            });
          }
        }
        // Verificar se é admin temporário
        else if (localUser.admin_temporario_ate) {
          const hoje = new Date();
          const dataExpiracao = new Date(localUser.admin_temporario_ate);

          if (dataExpiracao >= hoje) {
            isAdmin = true;
          } else {
            // Admin temporário expirado - remover privilégios
            await prisma.colaboradores.update({
              where: { email: userData.email },
              data: {
                admin_temporario_ate: null,
                tipo: "user",
                updated_at: new Date(),
              },
            });
          }
        }

        // Atualizar tipo se necessário
        const newTipo = isAdmin ? "admin" : "user";
        if (localUser.tipo !== newTipo) {
          await prisma.colaboradores.update({
            where: { email: userData.email },
            data: { tipo: newTipo, updated_at: new Date() },
          });
          localUser.tipo = newTipo;
        }
      } else {
        // Colaborador não existe - criar novo
        const isAdminPermanente = ADMINS_PERMANENTES.includes(
          userData.email.toLowerCase(),
        );
        const tipoUsuario = isAdminPermanente ? "admin" : "user";

        localUser = await prisma.colaboradores.create({
          data: {
            nome: userData.fullName,
            email: userData.email,
            tipo: tipoUsuario,
            departamento: userData.tenantDomain || "Senior Platform",
            cargo: userData.integration?.integrationName || "Colaborador",
            admin_permanente: isAdminPermanente,
          },
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true,
            departamento: true,
            cargo: true,
            admin_permanente: true,
            admin_temporario_ate: true,
          },
        });
      }
    } catch (dbError) {
      console.error("Erro ao verificar/criar colaborador:", dbError);
      return NextResponse.json(
        { error: "Erro ao processar dados do colaborador" },
        { status: 500 },
      );
    }

    // Criar objeto de usuário compatível com o sistema local
    const user = {
      id: localUser.id, // Usar ID local do banco
      nome: localUser.nome,
      email: localUser.email,
      tipo: localUser.tipo,
      departamento: localUser.departamento,
      cargo: localUser.cargo,
      seniorUsername: userData.username,
      seniorId: userData.id, // Manter ID do Senior para referência
      tenantName: userData.tenantName,
      tenantLocale: userData.tenantLocale,
      accessToken: accessToken,
      admin_permanente: localUser.admin_permanente || false,
      admin_temporario_ate: localUser.admin_temporario_ate || null,
    };

    return NextResponse.json({
      user,
      message: "Login realizado com sucesso",
    });
  } catch (error) {
    console.error("Erro no login com Senior:", error);
    return NextResponse.json(
      { error: "Erro ao processar login" },
      { status: 500 },
    );
  }
}
