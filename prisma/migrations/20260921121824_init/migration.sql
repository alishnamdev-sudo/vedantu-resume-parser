-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "programme" TEXT NOT NULL,
    "resumeFileName" TEXT NOT NULL,
    "resumeFilePath" TEXT NOT NULL,
    "resumeMimeType" TEXT NOT NULL,
    "resumeText" TEXT NOT NULL,
    "verdict" TEXT,
    "reason" TEXT,
    "matchedProfile" TEXT,
    "fastTrack" BOOLEAN NOT NULL DEFAULT false,
    "flags" TEXT,
    "rawAnalysis" TEXT,
    "analysisError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");
