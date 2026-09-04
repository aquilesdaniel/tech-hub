import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios" },
        { status: 400 },
      );
    }

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
        localUser = existingUser;

        let isAdmin = false;

        if (localUser.admin_permanente) {
          isAdmin = true;
        } else if (localUser.admin_temporario_ate) {
          const hoje = new Date();
          const dataExpiracao = new Date(localUser.admin_temporario_ate);

          if (dataExpiracao >= hoje) {
            isAdmin = true;
          } else {
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

        const newTipo = isAdmin ? "admin" : "user";
        if (localUser.tipo !== newTipo) {
          await prisma.colaboradores.update({
            where: { email: userData.email },
            data: { tipo: newTipo, updated_at: new Date() },
          });
          localUser.tipo = newTipo;
        }
      } else {
        localUser = await prisma.colaboradores.create({
          data: {
            nome: userData.fullName,
            email: userData.email,
            tipo: "user",
            departamento: userData.tenantDomain || "Senior Platform",
            cargo: userData.integration?.integrationName || "Colaborador",
            admin_permanente: false,
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

    const user = {
      id: localUser.id,
      nome: localUser.nome,
      email: localUser.email,
      tipo: localUser.tipo,
      departamento: localUser.departamento,
      cargo: localUser.cargo,
      seniorUsername: userData.username,
      seniorId: userData.id,
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
