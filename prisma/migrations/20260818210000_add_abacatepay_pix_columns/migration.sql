ALTER TABLE "pagamentos" ADD COLUMN "pix_id" VARCHAR,
ADD COLUMN "br_code" TEXT,
ADD COLUMN "br_code_base64" TEXT;

CREATE INDEX "pagamentos_pix_id_idx" ON "pagamentos"("pix_id");
