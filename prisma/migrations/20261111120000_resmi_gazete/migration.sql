-- CreateEnum
CREATE TYPE "GazetteItemKind" AS ENUM ('METIN', 'PDF', 'ILAN');

-- CreateTable
CREATE TABLE "gazette_issue" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "supplement" INTEGER NOT NULL DEFAULT 0,
    "number" INTEGER NOT NULL,
    "source_url" TEXT NOT NULL,
    "pdf_url" TEXT NOT NULL DEFAULT '',
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gazette_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gazette_item" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "kind" "GazetteItemKind" NOT NULL,
    "source_url" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "error" TEXT NOT NULL DEFAULT '',
    "content_fetched_at" TIMESTAMP(3),

    CONSTRAINT "gazette_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gazette_issue_date_idx" ON "gazette_issue"("date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "gazette_issue_date_supplement_key" ON "gazette_issue"("date", "supplement");

-- CreateIndex
CREATE INDEX "gazette_item_issue_id_position_idx" ON "gazette_item"("issue_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "gazette_item_issue_id_code_key" ON "gazette_item"("issue_id", "code");

-- AddForeignKey
ALTER TABLE "gazette_item" ADD CONSTRAINT "gazette_item_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "gazette_issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
