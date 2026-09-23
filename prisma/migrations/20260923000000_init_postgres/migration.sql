-- CreateEnum
CREATE TYPE "Programme" AS ENUM ('PHONICS', 'SUPER_SPEAKERS', 'SUPER_CODERS', 'SUPER_MATH');

-- CreateEnum
CREATE TYPE "Verdict" AS ENUM ('GTG', 'ON_HOLD', 'NOT_CONSIDERED');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('FORM', 'BULK_CSV');

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "subject" TEXT,
    "programme" "Programme" NOT NULL,
    "source" "Source" NOT NULL DEFAULT 'FORM',
    "resumeFileName" TEXT NOT NULL,
    "resumeFilePath" TEXT NOT NULL,
    "resumeMimeType" TEXT NOT NULL,
    "resumeText" TEXT NOT NULL,
    "resumeSourceUrl" TEXT,
    "verdict" "Verdict",
    "reason" TEXT,
    "matchedProfile" TEXT,
    "fastTrack" BOOLEAN NOT NULL DEFAULT false,
    "flags" TEXT,
    "rawAnalysis" TEXT,
    "analysisError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
