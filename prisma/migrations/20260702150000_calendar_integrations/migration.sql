-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK');

-- CreateEnum
CREATE TYPE "CalendarConnectionStatus" AS ENUM ('ATIVA', 'EXPIRADA', 'REVOGADA');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "externalEventId" TEXT,
ADD COLUMN     "externalProvider" "CalendarProvider";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "icsToken" TEXT;

-- CreateTable
CREATE TABLE "CalendarConnection" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "status" "CalendarConnectionStatus" NOT NULL DEFAULT 'ATIVA',
    "accountEmail" TEXT,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConnection_businessId_provider_key" ON "CalendarConnection"("businessId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Business_icsToken_key" ON "Business"("icsToken");

-- AddForeignKey
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

