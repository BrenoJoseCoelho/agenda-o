-- CreateEnum
CREATE TYPE "Formality" AS ENUM ('INFORMAL', 'NEUTRO', 'FORMAL');

-- CreateEnum
CREATE TYPE "EmojiLevel" AS ENUM ('NENHUM', 'POUCO', 'BASTANTE');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "avoid" TEXT,
ADD COLUMN     "emojiLevel" "EmojiLevel" NOT NULL DEFAULT 'POUCO',
ADD COLUMN     "examples" TEXT,
ADD COLUMN     "formality" "Formality" NOT NULL DEFAULT 'NEUTRO',
ADD COLUMN     "signature" TEXT;

