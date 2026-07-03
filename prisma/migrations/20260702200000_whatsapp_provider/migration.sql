-- CreateEnum
CREATE TYPE "WhatsappProvider" AS ENUM ('META', 'D360');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "whatsappApiKey" TEXT,
ADD COLUMN     "whatsappChannelId" TEXT,
ADD COLUMN     "whatsappProvider" "WhatsappProvider" NOT NULL DEFAULT 'META';

