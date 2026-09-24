-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "defaultModel" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "systemPrompt" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "completionTokens" INTEGER;
ALTER TABLE "Message" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "Message" ADD COLUMN "promptTokens" INTEGER;
ALTER TABLE "Message" ADD COLUMN "reasoningTokens" INTEGER;
ALTER TABLE "Message" ADD COLUMN "totalTokens" INTEGER;

-- CreateTable
CREATE TABLE "ProviderCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "label" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "lastValidated" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProviderCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProviderCredential_userId_idx" ON "ProviderCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCredential_userId_providerId_key" ON "ProviderCredential"("userId", "providerId");
