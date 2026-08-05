// Traduz os caminhos de campo que a Pagar.me retorna em validações (ex:
// "register_information.phone_numbers") para um rótulo legível em português.
const CAMPOS_AMIGAVEIS: Record<string, string> = {
  "register_information.email": "E-mail",
  "register_information.document": "CPF",
  "register_information.name": "Nome completo",
  "register_information.birthdate": "Data de nascimento",
  "register_information.monthly_income": "Renda mensal",
  "register_information.professional_occupation": "Ocupação",
  "register_information.phone_numbers": "Telefone",
  "default_bank_account.holder_name": "Nome do titular",
  "default_bank_account.holder_document": "Documento do titular",
  "default_bank_account.bank": "Banco",
  "default_bank_account.branch_number": "Agência",
  "default_bank_account.branch_check_digit": "Dígito da agência",
  "default_bank_account.account_number": "Conta",
  "default_bank_account.account_check_digit": "Dígito da conta",
  "default_bank_account.type": "Tipo de conta",
  "bank_account.holder_name": "Nome do titular",
  "bank_account.holder_document": "Documento do titular",
  "bank_account.bank": "Banco",
  "bank_account.branch_number": "Agência",
  "bank_account.branch_check_digit": "Dígito da agência",
  "bank_account.account_number": "Conta",
  "bank_account.account_check_digit": "Dígito da conta",
  "bank_account.type": "Tipo de conta",
  amount: "Valor",
  recipient_id: "Conta bancária",
};

interface DetalhesErroPagarme {
  message?: string;
  errors?: Record<string, string[]>;
}

// Extrai uma mensagem por campo/erro retornado pela Pagar.me, pronta para exibir
// em toasts individuais. Retorna [] quando o formato não é reconhecido.
export function extrairErrosPagarme(detalhes: unknown): string[] {
  if (!detalhes || typeof detalhes !== "object") return [];
  const { errors, message } = detalhes as DetalhesErroPagarme;

  if (errors && typeof errors === "object") {
    return Object.entries(errors).flatMap(([campo, mensagens]) =>
      mensagens.map((msg) => `${CAMPOS_AMIGAVEIS[campo] || campo}: ${msg}`),
    );
  }

  return message ? [message] : [];
}
