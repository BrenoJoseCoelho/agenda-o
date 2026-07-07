import { requireBusiness } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/env";
import { formatBRL } from "@/lib/pricing";
import {
  createUnitAction,
  removeUnitAction,
  addReservationAction,
  cancelReservationAction,
  addFeedAction,
  removeFeedAction,
  syncNowAction,
} from "@/app/actions/lodging-actions";
import CopyField from "../integracoes/CopyField";
import type { ReservationSource } from "@/generated/prisma/client";

const SOURCE_STYLE: Record<ReservationSource, string> = {
  DIRETO: "bg-emerald-400/10 text-emerald-500 border border-emerald-400/25",
  AIRBNB: "bg-rose-400/10 text-rose-500 border border-rose-400/25",
  BOOKING: "bg-sky-400/10 text-sky-500 border border-sky-400/25",
  OUTRO: "bg-soft text-3 bd border",
};
const SOURCE_LABEL: Record<ReservationSource, string> = {
  DIRETO: "Direto",
  AIRBNB: "Airbnb",
  BOOKING: "Booking",
  OUTRO: "Externo",
};

const OK: Record<string, string> = { reserva_criada: "Reserva criada." };
const ERR: Record<string, string> = {
  datas_ocupadas: "Essas datas ja estao ocupadas nessa unidade.",
  datas_invalidas: "Datas invalidas.",
  unidade_invalida: "Unidade invalida.",
};

function fmt(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

export default async function HospedagemPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { businessId: routeParam } = await params;
  const { ok, error } = await searchParams;
  const { business } = await requireBusiness(routeParam);
  const businessId = business.id;

  const today = new Date();
  const startToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const units = await prisma.rentalUnit.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
    include: {
      feeds: true,
      reservations: {
        where: { status: { not: "CANCELADA" }, checkOut: { gte: startToday } },
        orderBy: { checkIn: "asc" },
      },
    },
  });

  const base = appUrl();
  const createUnit = createUnitAction.bind(null, businessId);
  const addReservation = addReservationAction.bind(null, businessId);
  const syncNow = syncNowAction.bind(null, businessId);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-1">Hospedagem</h1>
          <p className="text-sm text-2 mt-1">
            Suas unidades, reservas e a sincronizacao com o Airbnb (nunca dobra reserva).
          </p>
        </div>
        {units.some((u) => u.feeds.length > 0) && (
          <form action={syncNow}>
            <button className="btn-ghost text-sm whitespace-nowrap" type="submit">
              Sincronizar agora
            </button>
          </form>
        )}
      </div>

      {ok && OK[ok] && (
        <div className="text-sm rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-500 px-4 py-3">
          {OK[ok]}
        </div>
      )}
      {error && ERR[error] && (
        <div className="text-sm rounded-xl border border-rose-400/25 bg-rose-400/10 text-rose-500 px-4 py-3">
          {ERR[error]}
        </div>
      )}

      {units.length === 0 && (
        <div className="glass rounded-2xl p-6 text-sm text-2">
          Cadastre sua primeira unidade (cabana, chale, quarto) abaixo para comecar.
        </div>
      )}

      {units.map((unit) => {
        const exportUrl = `${base}/api/hospedagem/${unit.icsToken}`;
        const removeUnit = removeUnitAction.bind(null, businessId, unit.id);
        const addFeed = addFeedAction.bind(null, businessId);
        return (
          <div key={unit.id} className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-1">{unit.name}</div>
                <div className="text-xs text-2 mt-0.5">
                  {formatBRL(unit.nightlyPriceCents)}/noite · ate {unit.capacity} hospedes
                </div>
              </div>
              <form action={removeUnit}>
                <button className="text-xs text-red-500 hover:text-red-400" type="submit">
                  Excluir
                </button>
              </form>
            </div>

            {/* Reservas */}
            <div className="border-t bd pt-3">
              <div className="text-xs font-medium text-2 mb-2">Proximas reservas</div>
              {unit.reservations.length === 0 ? (
                <div className="text-xs text-3">Nenhuma reserva futura.</div>
              ) : (
                <ul className="space-y-1.5">
                  {unit.reservations.map((r) => {
                    const cancel = cancelReservationAction.bind(null, businessId, r.id);
                    return (
                      <li key={r.id} className="flex items-center justify-between text-sm">
                        <span className="text-2">
                          {fmt(r.checkIn)} → {fmt(r.checkOut)}
                          {r.guestName ? <span className="text-3 ml-2">{r.guestName}</span> : null}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${SOURCE_STYLE[r.source]}`}>
                            {SOURCE_LABEL[r.source]}
                          </span>
                          {r.source === "DIRETO" && (
                            <form action={cancel}>
                              <button className="text-xs text-3 hover:text-red-500" type="submit">
                                cancelar
                              </button>
                            </form>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Sincronizacao Airbnb/Booking */}
            <div className="border-t bd pt-3 space-y-3">
              <div className="text-xs font-medium text-2">Sincronizar com Airbnb / Booking</div>

              <div>
                <div className="text-[11px] text-3 mb-1">
                  1. Cole esta URL no Airbnb/Booking (Importar calendario) para bloquearem suas reservas diretas:
                </div>
                <CopyField value={exportUrl} />
              </div>

              <div>
                <div className="text-[11px] text-3 mb-1">
                  2. Cole aqui a URL de calendario (iCal) que o Airbnb/Booking te dao, para bloquearmos as datas ja reservadas la:
                </div>
                {unit.feeds.map((f) => {
                  const removeFeed = removeFeedAction.bind(null, businessId, f.id);
                  return (
                    <div key={f.id} className="flex items-center justify-between gap-2 text-xs py-1">
                      <span className="text-2 truncate">
                        <span className="text-emerald-500">{f.label}</span> ·{" "}
                        {f.lastSyncAt ? `sync ${fmt(f.lastSyncAt)}` : "aguardando sync"}
                      </span>
                      <form action={removeFeed}>
                        <button className="text-3 hover:text-red-500" type="submit">
                          remover
                        </button>
                      </form>
                    </div>
                  );
                })}
                <form action={addFeed} className="flex gap-2 mt-1">
                  <input type="hidden" name="unitId" value={unit.id} />
                  <input name="label" placeholder="Airbnb" className="input-app w-24 text-sm" />
                  <input name="url" placeholder="https://...ics" className="input-app flex-1 text-sm" />
                  <button className="btn-ghost text-sm" type="submit">
                    Adicionar
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      })}

      {/* Nova reserva manual */}
      {units.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="text-sm font-semibold text-1">Nova reserva</div>
          <form action={addReservation} className="grid grid-cols-2 gap-2 items-end">
            <label className="space-y-1 col-span-2">
              <span className="text-xs text-2">Unidade</span>
              <select name="unitId" className="input-app w-full">
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 col-span-2">
              <span className="text-xs text-2">Hospede</span>
              <input name="guestName" placeholder="Nome" className="input-app w-full" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-2">Check-in</span>
              <input name="checkIn" type="date" className="input-app w-full" required />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-2">Check-out</span>
              <input name="checkOut" type="date" className="input-app w-full" required />
            </label>
            <button className="btn-primary col-span-2" type="submit">
              Criar reserva
            </button>
          </form>
        </div>
      )}

      {/* Nova unidade */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="text-sm font-semibold text-1">Nova unidade</div>
        <form action={createUnit} className="grid grid-cols-[1fr_110px_90px_auto] gap-2 items-end">
          <label className="space-y-1">
            <span className="text-xs text-2">Nome</span>
            <input name="name" placeholder="Cabana da Mata" className="input-app" required />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-2">Diaria (R$)</span>
            <input name="nightly" placeholder="300" className="input-app" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-2">Hospedes</span>
            <input name="capacity" defaultValue={2} className="input-app" />
          </label>
          <button className="btn-ghost" type="submit">
            Adicionar
          </button>
        </form>
      </div>
    </div>
  );
}
