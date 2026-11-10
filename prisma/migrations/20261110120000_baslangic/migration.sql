-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('TASLAK', 'YAYINDA');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DOGRULANMAYI_BEKLIYOR', 'DOGRULANDI');

-- CreateTable
CREATE TABLE "user_account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Hukuk',
    "author" TEXT NOT NULL DEFAULT 'Müessir',
    "status" "ArticleStatus" NOT NULL DEFAULT 'TASLAK',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "law" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "law_number" TEXT NOT NULL DEFAULT '',
    "short_name" TEXT NOT NULL DEFAULT '',
    "official_url" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'DOGRULANMAYI_BEKLIYOR',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "law_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_law" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "law_id" TEXT NOT NULL,
    "provision" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "article_law_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_email_key" ON "user_account"("email");

-- CreateIndex
CREATE INDEX "session_user_id_idx" ON "session"("user_id");

-- CreateIndex
CREATE INDEX "session_expires_at_idx" ON "session"("expires_at");

-- CreateIndex
CREATE INDEX "login_attempt_key_created_at_idx" ON "login_attempt"("key", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "article_slug_key" ON "article"("slug");

-- CreateIndex
CREATE INDEX "article_status_published_at_idx" ON "article"("status", "published_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "law_slug_key" ON "law"("slug");

-- CreateIndex
CREATE INDEX "article_law_law_id_idx" ON "article_law"("law_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_law_article_id_law_id_provision_key" ON "article_law"("article_id", "law_id", "provision");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_law" ADD CONSTRAINT "article_law_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_law" ADD CONSTRAINT "article_law_law_id_fkey" FOREIGN KEY ("law_id") REFERENCES "law"("id") ON DELETE CASCADE ON UPDATE CASCADE;
