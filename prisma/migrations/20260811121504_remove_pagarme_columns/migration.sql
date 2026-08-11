ALTER TABLE "colaboradores" DROP COLUMN "recipient_id";

ALTER TABLE "pagamentos" DROP COLUMN "charge_id",
DROP COLUMN "gateway_id",
DROP COLUMN "order_id",
DROP COLUMN "qr_code";
