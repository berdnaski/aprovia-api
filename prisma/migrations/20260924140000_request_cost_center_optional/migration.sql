-- O rascunho pode nascer sem Centro de Custo: a leitura assistida tenta
-- identificar e quem pede confirma antes de enviar para aprovação.
ALTER TABLE "purchase_requests" ALTER COLUMN "cost_center_id" DROP NOT NULL;
