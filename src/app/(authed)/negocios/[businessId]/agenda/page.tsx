import Link from "next/link";
import { requireBusiness } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  cancelAppointmentAction,
  rescheduleAppointmentAction,
} from "@/app/actions/agenda-actions";
import DayPicker from "./DayPicker";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ d?: string }>;
}) {
  const { businessId } = await params;
  const { d } = await searchParams;
  await requireBusiness(businessId); // valida acesso do usuario a este negocio

  const today = new Date();
  const selected = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00`) : today;
  const dayKey = ymd(selected);

  const dayStart = new Date(`${dayKey}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const prev = new Date(dayStart);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(dayStart);
  next.setDate(next.getDate() + 1);

  const appts = await prisma.appointment.findMany({
    where: {
      businessId,
      status: "CONFIRMADO",
      scheduledAt: { gte: dayStart, lt: dayEnd },
    },
    include: { contact: true, service: true },
    orderBy: { scheduledAt: "asc" },
  });

  const totalCents = appts.reduce((sum, a) => sum + a.service.priceCents, 0);
  const isToday = dayKey === ymd(today);
  const longDate = selected.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const reschedule = rescheduleAppointmentAction.bind(null, businessId);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-1">Agenda</h1>
          <p className="text-sm text-2 mt-1 capitalize">
            {longDate}
            {isToday && <span className="text-emerald-500"> · hoje</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`?d=${ymd(prev)}`} className="btn-ghost !px-3" aria-label="Dia anterior">
            ‹
          </Link>
          <Link href={`?d=${ymd(today)}`} className="btn-ghost !px-3 text-xs">
            Hoje
          </Link>
          <Link href={`?d=${ymd(next)}`} className="btn-ghost !px-3" aria-label="Proximo dia">
            ›
          </Link>
          <DayPicker value={dayKey} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-2">Agendamentos no dia</div>
          <div className="text-2xl font-semibold text-1 mt-1">{appts.length}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs text-2">Receita prevista</div>
          <div className="text-2xl font-semibold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent mt-1">
            {formatPrice(totalCents)}
          </div>
        </div>
      </div>

      {appts.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-2">
          Nenhum agendamento neste dia.
        </div>
      ) : (
        <div className="space-y-2">
          {appts.map((a) => {
            const time = a.scheduledAt.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const cancel = cancelAppointmentAction.bind(null, businessId, a.id);
            return (
              <div key={a.id} className="glass rounded-2xl p-4 flex items-start gap-4">
                <div className="text-center shrink-0 w-14">
                  <div className="text-lg font-semibold text-1">{time}</div>
                  <div className="text-[10px] text-3">{a.service.durationMinutes}min</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-1">{a.contact.name}</div>
                  <div className="text-xs text-2">
                    {a.service.name} · {formatPrice(a.service.priceCents)} · {a.contact.phone}
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <details>
                      <summary className="text-xs text-emerald-500 cursor-pointer select-none list-none hover:text-emerald-400">
                        Remarcar
                      </summary>
                      <form action={reschedule} className="flex items-end gap-2 mt-2">
                        <input type="hidden" name="appointmentId" value={a.id} />
                        <input type="date" name="date" defaultValue={ymd(a.scheduledAt)} className="input-app !w-auto text-xs" />
                        <input type="time" name="time" defaultValue={time} className="input-app !w-auto text-xs" />
                        <button type="submit" className="btn-ghost !py-1.5 text-xs">
                          Confirmar
                        </button>
                      </form>
                    </details>

                    <form action={cancel}>
                      <button type="submit" className="text-xs text-red-500 hover:text-red-400">
                        Cancelar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
