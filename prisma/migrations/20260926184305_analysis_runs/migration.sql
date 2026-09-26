-- CreateEnum
CREATE TYPE "AnalysisTrigger" AS ENUM ('FORM', 'BULK_CSV', 'RETRY', 'REANALYZE');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('OK', 'INVALID_JSON', 'SCHEMA_MISMATCH', 'API_ERROR');

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT,
    "trigger" "AnalysisTrigger" NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "AnalysisStatus" NOT NULL,
    "errorMessage" TEXT,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER,
    "cachedInputTokens" INTEGER,
    "outputTokens" INTEGER,
    "thinkingTokens" INTEGER,
    "costUsd" DECIMAL(10,6),
    "verdict" "Verdict",
    "fastTrack" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalysisRun_createdAt_idx" ON "AnalysisRun"("createdAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_candidateId_idx" ON "AnalysisRun"("candidateId");

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
