-- AlterTable
ALTER TABLE "RoleCardDefault" ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT 'image/png';
ALTER TABLE "RoleCardDefault" ADD COLUMN "imageBase64" TEXT NOT NULL DEFAULT '';

-- Ancienne colonne URL : les images se gèrent en base64 depuis l’admin
ALTER TABLE "RoleCardDefault" DROP COLUMN "imageUrl";
