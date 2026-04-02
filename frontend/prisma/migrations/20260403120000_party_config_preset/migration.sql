-- CreateTable
CREATE TABLE "PartyConfigPreset" (
    "id" TEXT NOT NULL,
    "publicCode" VARCHAR(5) NOT NULL,
    "name" TEXT,
    "userId" TEXT,
    "composition" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyConfigPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartyConfigPreset_publicCode_key" ON "PartyConfigPreset"("publicCode");

-- CreateIndex
CREATE INDEX "PartyConfigPreset_userId_idx" ON "PartyConfigPreset"("userId");

-- AddForeignKey
ALTER TABLE "PartyConfigPreset" ADD CONSTRAINT "PartyConfigPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
