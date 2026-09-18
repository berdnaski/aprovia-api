-- Uma assinatura recorrente reaproveita o pedido de origem em cada ciclo mensal,
-- então mais de um lançamento CONSUMPTION por pedido passa a ser esperado —
-- desde que cada um aponte para o orcamento (periodo) de um mes diferente.
DROP INDEX IF EXISTS "idx_one_consumption_per_request";
DROP INDEX IF EXISTS "budget_entries_one_consumption_per_request";

CREATE UNIQUE INDEX "budget_entries_one_consumption_per_request_per_budget"
  ON "budget_entries" ("budget_id", "purchase_request_id")
  WHERE "type" = 'CONSUMPTION';
