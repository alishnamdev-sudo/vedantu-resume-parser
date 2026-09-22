-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "subject" TEXT,
    "programme" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'FORM',
    "resumeFileName" TEXT NOT NULL,
    "resumeFilePath" TEXT NOT NULL,
    "resumeMimeType" TEXT NOT NULL,
    "resumeText" TEXT NOT NULL,
    "resumeSourceUrl" TEXT,
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
INSERT INTO "new_Candidate" ("analysisError", "createdAt", "email", "fastTrack", "flags", "id", "matchedProfile", "name", "phone", "programme", "rawAnalysis", "reason", "resumeFileName", "resumeFilePath", "resumeMimeType", "resumeText", "updatedAt", "verdict") SELECT "analysisError", "createdAt", "email", "fastTrack", "flags", "id", "matchedProfile", "name", "phone", "programme", "rawAnalysis", "reason", "resumeFileName", "resumeFilePath", "resumeMimeType", "resumeText", "updatedAt", "verdict" FROM "Candidate";
DROP TABLE "Candidate";
ALTER TABLE "new_Candidate" RENAME TO "Candidate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
