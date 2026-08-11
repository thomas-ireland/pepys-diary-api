-- AlterTable
-- Generated rather than backfilled: Postgres computes and maintains it from
-- `text` on every insert/update, so it can never drift out of sync.
ALTER TABLE "entries" ADD COLUMN     "searchVector" tsvector NOT NULL
    GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED;

-- CreateIndex
CREATE INDEX "entries_searchVector_idx" ON "entries" USING GIN ("searchVector");
