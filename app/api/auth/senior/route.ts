import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

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
    let localUser;
    try {
      const existingUsers = await query(
        `SELECT id, nome, email, tipo, departamento, cargo, admin_permanente, admin_temporario_ate 
         FROM colaboradores WHERE email = $1`,
        [userData.email],
      );

      if (existingUsers.length > 0) {
        // Colaborador já existe - verificar status de admin
        localUser = existingUsers[0];

        // Lista de emails de admins permanentes
        const adminsPermanentes = [
          "weliton.ribeiro@prismainformatica.com.br",
          "edson@prismainformatica.com.br",
          "ivan@prismainformatica.com.br",
          "jose.xavier@prismainformatica.com.br",
          "everson.freire@prismainformatica.com.br",
        ];

        let isAdmin = false;
        let motivoAdmin = "";

        // Verificar se é admin permanente
        if (
          adminsPermanentes.includes(userData.email.toLowerCase()) ||
          localUser.admin_permanente
        ) {
          isAdmin = true;
          motivoAdmin = "permanente";

          // Garantir que está marcado como admin permanente no banco
          if (!localUser.admin_permanente) {
            await query(
              "UPDATE colaboradores SET admin_permanente = TRUE, tipo = 'admin', updated_at = CURRENT_TIMESTAMP WHERE email = $1",
              [userData.email],
            );
          }
        }
        // Verificar se é admin temporário
        else if (localUser.admin_temporario_ate) {
          const hoje = new Date();
          const dataExpiracao = new Date(localUser.admin_temporario_ate);

          if (dataExpiracao >= hoje) {
            isAdmin = true;
            motivoAdmin = "temporario";
          } else {
            // Admin temporário expirado - remover privilégios
            await query(
              "UPDATE colaboradores SET admin_temporario_ate = NULL, tipo = 'user', updated_at = CURRENT_TIMESTAMP WHERE email = $1",
              [userData.email],
            );
          }
        }

        // Atualizar tipo se necessário
        const newTipo = isAdmin ? "admin" : "user";
        if (localUser.tipo !== newTipo) {
          await query(
            "UPDATE colaboradores SET tipo = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2",
            [newTipo, userData.email],
          );
          localUser.tipo = newTipo;
        }
      } else {
        // Colaborador não existe - criar novo
        const adminsPermanentes = [
          "weliton.ribeiro@prismainformatica.com.br",
          "edson@prismainformatica.com.br",
          "ivan@prismainformatica.com.br",
          "jose.xavier@prismainformatica.com.br",
          "everson.freire@prismainformatica.com.br",
        ];

        const isAdminPermanente = adminsPermanentes.includes(
          userData.email.toLowerCase(),
        );
        const tipoUsuario = isAdminPermanente ? "admin" : "user";

        const newUserResult = await query(
          `INSERT INTO colaboradores (nome, email, tipo, departamento, cargo, admin_permanente, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
           RETURNING id, nome, email, tipo, departamento, cargo, admin_permanente, admin_temporario_ate`,
          [
            userData.fullName,
            userData.email,
            tipoUsuario,
            userData.tenantDomain || "Senior Platform",
            userData.integration?.integrationName || "Colaborador",
            isAdminPermanente,
          ],
        );

        localUser = newUserResult[0];
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
