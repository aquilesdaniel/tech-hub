import {
  atualizarContaBancariaRecebedor,
  atualizarRecebedor,
  criarRecebedor,
  obterRecebedor,
  PagarmeApiError,
} from "@/lib/pagarme";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

// GET - Retorna os dados do recebedor já cadastrado para o colaborador (para pré-preencher o formulário de edição)
export async function GET(req: NextRequest) {
  try {
    const colaborador_id = req.nextUrl.searchParams.get("colaborador_id");

    if (!colaborador_id) {
      return NextResponse.json(
        { error: "O colaborador é obrigatório" },
        { status: 400 },
      );
    }

    const colaborador = await prisma.colaboradores.findUnique({
      where: { id: Number(colaborador_id) },
      select: { recipient_id: true },
    });

    if (!colaborador?.recipient_id) {
      return NextResponse.json({ recipient: null });
    }

    const recipient = await obterRecebedor(colaborador.recipient_id);

    return NextResponse.json({ recipient });
  } catch (error) {
    if (error instanceof PagarmeApiError) {
      console.error("Erro retornado pela Pagar.me:", error.details);
      return NextResponse.json(
        { error: "Erro ao consultar recebedor", detalhes: error.details },
        { status: 502 },
      );
    }
    console.error("Erro ao consultar recebedor:", error);
    return NextResponse.json(
      { error: "Erro interno ao consultar recebedor" },
      { status: 500 },
    );
  }
}

// POST - Cria o recebedor na Pagar.me (ou atualiza, caso o colaborador já possua um)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      colaborador_id,
      nomeColaborador,
      emailColaborador,
      documentoColaborador,
      aniversario,
      rendaMensal,
      ocupacao,
      telefoneDdd,
      telefoneNumero,
      cep,
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      pontoReferencia,
      nomeTitular,
      documentoTitular,
      banco,
      agencia,
      agenciaDv,
      conta,
      contaDv,
      tipoConta,
      observacao,
    } = body;

    if (
      !colaborador_id ||
      !nomeColaborador ||
      !emailColaborador ||
      !documentoColaborador ||
      !aniversario ||
      !ocupacao ||
      !telefoneDdd ||
      !telefoneNumero ||
      !cep ||
      !rua ||
      !numero ||
      !bairro ||
      !cidade ||
      !estado ||
      !nomeTitular ||
      !documentoTitular ||
      !banco ||
      !agencia ||
      !conta ||
      !contaDv
    ) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios" },
        { status: 400 },
      );
    }

    const colaborador = await prisma.colaboradores.findUnique({
      where: { id: Number(colaborador_id) },
      select: { recipient_id: true },
    });

    if (!colaborador) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 },
      );
    }

    const registerInformation = {
      email: emailColaborador,
      document: documentoColaborador,
      name: nomeColaborador,
      birthdate: aniversario,
      monthlyIncome: parseInt(rendaMensal, 10) || 0,
      professionalOccupation: ocupacao,
      telefone: { areaCode: telefoneDdd, number: telefoneNumero },
      endereco: {
        street: rua,
        streetNumber: numero,
        neighborhood: bairro,
        city: cidade,
        state: estado,
        zipCode: String(cep).replace(/\D/g, ""),
        complementary: complemento || undefined,
        referencePoint: pontoReferencia || undefined,
      },
    };

    const bankAccount = {
      holderName: nomeTitular,
      holderDocument: documentoTitular,
      bank: banco,
      branchNumber: agencia,
      branchCheckDigit: agenciaDv || undefined,
      accountNumber: conta,
      accountCheckDigit: contaDv,
      tipoConta: (tipoConta === "savings" ? "savings" : "checking") as
        | "checking"
        | "savings",
    };

    let recipient;

    if (colaborador.recipient_id) {
      // Colaborador já possui recebedor cadastrado: atualiza os dados existentes
      [recipient] = await Promise.all([
        atualizarRecebedor(colaborador.recipient_id, {
          registerInformation,
          observacao,
        }),
        atualizarContaBancariaRecebedor(colaborador.recipient_id, bankAccount),
      ]);
    } else {
      // Primeiro cadastro: cria o recebedor na Pagar.me
      recipient = await criarRecebedor({
        code: String(colaborador_id),
        registerInformation,
        bankAccount,
        observacao,
      });

      await prisma.colaboradores.update({
        where: { id: Number(colaborador_id) },
        data: { recipient_id: recipient.id },
      });
    }

    return NextResponse.json(recipient, { status: 201 });
  } catch (error) {
    if (error instanceof PagarmeApiError) {
      console.error("Erro retornado pela Pagar.me:", error.details);
      return NextResponse.json(
        {
          error: "Erro ao cadastrar conta bancária no gateway de pagamento",
          detalhes: error.details,
        },
        { status: 502 },
      );
    }
    console.error("Erro ao cadastrar/atualizar recebedor:", error);
    return NextResponse.json(
      { error: "Erro interno ao cadastrar conta bancária" },
      { status: 500 },
    );
  }
}
