-- AlterTable
ALTER TABLE "PartyConfigPreset" ADD COLUMN "roleImageOverrides" JSONB;

-- CreateTable
CREATE TABLE "RoleCardDefault" (
    "roleKey" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleCardDefault_pkey" PRIMARY KEY ("roleKey")
);
