-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "certificacoes" (
    "id" SERIAL NOT NULL,
    "colaborador_id" INTEGER NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "tipo" VARCHAR(100) NOT NULL,
    "instituicao" VARCHAR(200) NOT NULL,
    "data_obtencao" DATE NOT NULL,
    "data_vencimento" DATE,
    "url_credencial" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colaboradores" (
    "id" SERIAL NOT NULL,
    "setor_id" INTEGER,
    "nome" VARCHAR NOT NULL,
    "email" VARCHAR,
    "senha" VARCHAR,
    "tipo" VARCHAR DEFAULT 'user',
    "departamento" VARCHAR NOT NULL,
    "cargo" VARCHAR,
    "data_admissao" TIMESTAMPTZ(6),
    "status" VARCHAR DEFAULT 'ativo',
    "admin_permanente" BOOLEAN DEFAULT false,
    "admin_temporario_ate" TIMESTAMPTZ(6),
    "total_gasto_salgados" DECIMAL(10,2) DEFAULT 0,
    "country_code" VARCHAR,
    "area_code" VARCHAR,
    "number" VARCHAR,
    "document" VARCHAR,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "recipient_id" VARCHAR,

    CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividas" (
    "id" SERIAL NOT NULL,
    "colaborador_id" INTEGER NOT NULL,
    "item" VARCHAR(100) NOT NULL,
    "motivo" TEXT,
    "data_inicio" DATE NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "pago" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dividas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emprestimos" (
    "id" SERIAL NOT NULL,
    "livro_id" INTEGER NOT NULL,
    "colaborador_id" INTEGER NOT NULL,
    "data_emprestimo" DATE NOT NULL,
    "data_prevista_devolucao" DATE NOT NULL,
    "data_real_devolucao" DATE,
    "status" VARCHAR(20) DEFAULT 'emprestado',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livros" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "autor" VARCHAR(100) NOT NULL,
    "genero" VARCHAR(50),
    "isbn" VARCHAR(20),
    "disponivel" BOOLEAN DEFAULT true,
    "capa" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" SERIAL NOT NULL,
    "divida_id" INTEGER,
    "colaborador_id" INTEGER,
    "status" VARCHAR,
    "qr_code" VARCHAR,
    "expires_at" TIMESTAMPTZ(6),
    "charge_id" VARCHAR,
    "gateway_id" VARCHAR,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "setores" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "colaboradores_email_key" ON "colaboradores"("email");

-- AddForeignKey
ALTER TABLE "certificacoes" ADD CONSTRAINT "certificacoes_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "colaboradores" ADD CONSTRAINT "colaboradores_setor_id_fkey" FOREIGN KEY ("setor_id") REFERENCES "setores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "dividas" ADD CONSTRAINT "dividas_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_colaborador_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_livro_id_fkey" FOREIGN KEY ("livro_id") REFERENCES "livros"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_colaboradores_id_fkey" FOREIGN KEY ("colaborador_id") REFERENCES "colaboradores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_dividas_id_fkey" FOREIGN KEY ("divida_id") REFERENCES "dividas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

