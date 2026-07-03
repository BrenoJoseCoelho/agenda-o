-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "clientMemoryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "idleSlotEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noShowReminderEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "winBackDays" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "winBackEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "memory" TEXT;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "winBackSentAt" TIMESTAMP(3);

