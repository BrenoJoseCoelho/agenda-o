-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WHATSAPP', 'INSTAGRAM');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "instagramAccessToken" TEXT,
ADD COLUMN     "instagramAccountId" TEXT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "channel" "Channel" NOT NULL DEFAULT 'WHATSAPP';

