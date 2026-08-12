CREATE UNIQUE INDEX "budget_entries_one_consumption_per_request"
  ON "budget_entries" ("purchase_request_id")
  WHERE "type" = 'CONSUMPTION';
