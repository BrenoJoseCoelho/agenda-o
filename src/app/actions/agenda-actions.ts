"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireBusiness } from "@/lib/access";
import { deleteExternalEvent, pushEventToCalendar } from "@/lib/calendar";

async function loadAppointment(businessId: string, appointmentId: string) {
  const { business } = await requireBusiness(businessId);
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: true },
  });
  if (!appt || appt.businessId !== business.id) return null;
  return { business, appt };
}

export async function cancelAppointmentAction(businessId: string, appointmentId: string) {
  const loaded = await loadAppointment(businessId, appointmentId);
  if (!loaded) return;
  const { business, appt } = loaded;

  if (appt.externalProvider && appt.externalEventId) {
    await deleteExternalEvent(business.id, appt.externalProvider, appt.externalEventId);
  }

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { status: "CANCELADO", externalEventId: null, externalProvider: null },
  });

  revalidatePath(`/negocios/${business.slug}/agenda`);
}

export async function rescheduleAppointmentAction(businessId: string, formData: FormData) {
  const appointmentId = String(formData.get("appointmentId") || "");
  const dateStr = String(formData.get("date") || "");
  const timeStr = String(formData.get("time") || "");
  if (!appointmentId || !dateStr || !timeStr) return;

  const loaded = await loadAppointment(businessId, appointmentId);
  if (!loaded) return;
  const { business, appt } = loaded;

  const newStart = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(newStart.getTime())) return;

  // Remove the old external event, then create a new one for the new time.
  if (appt.externalProvider && appt.externalEventId) {
    await deleteExternalEvent(business.id, appt.externalProvider, appt.externalEventId);
  }
  const pushed = await pushEventToCalendar({
    business,
    summary: `${appt.service.name} - Atende AI`,
    description: "Remarcado pelo painel.",
    start: newStart,
    durationMinutes: appt.service.durationMinutes,
  });

  await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      scheduledAt: newStart,
      status: "CONFIRMADO",
      reminderSentAt: null, // vai lembrar de novo para o novo horario
      externalProvider: pushed?.provider ?? null,
      externalEventId: pushed?.eventId ?? null,
    },
  });

  revalidatePath(`/negocios/${business.slug}/agenda`);
}
