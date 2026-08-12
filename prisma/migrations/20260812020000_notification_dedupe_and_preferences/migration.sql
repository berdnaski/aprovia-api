ALTER TABLE "notifications" ADD COLUMN "dedupe_key" TEXT;

UPDATE "notifications" SET "dedupe_key" = "id" WHERE "dedupe_key" IS NULL;

ALTER TABLE "notifications" ALTER COLUMN "dedupe_key" SET NOT NULL;

CREATE UNIQUE INDEX "notifications_dedupe_key_key"
  ON "notifications" ("dedupe_key");

CREATE INDEX "notifications_recipient_id_company_id_created_at_idx"
  ON "notifications" ("recipient_id", "company_id", "created_at");

CREATE TABLE "notification_preferences" (
  "id"            TEXT NOT NULL,
  "user_id"       TEXT NOT NULL,
  "event"         "NotificationEvent" NOT NULL,
  "email_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_preferences_user_id_event_key"
  ON "notification_preferences" ("user_id", "event");

ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
