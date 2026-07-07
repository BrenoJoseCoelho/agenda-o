import { requireBusiness } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getBusinessInsights } from "@/lib/insights";
import { formatBRL } from "@/lib/pricing";
import HourlyChart from "./HourlyChart";

// Simplified "business hours" window for the after-hours insight: 08:00-20:00.
// A future version should derive this from Business.openingHours once it has a structured format.
const OPEN_HOUR = 8;
const CLOSE_HOUR = 20;

export default async function PainelPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId: routeParam } = await params;
  const { business } = await requireBusiness(routeParam);
  const businessId = business.id;

  const [conversations, appointmentsCount, contactsCount, insights] = await Promise.all([
    prisma.conversation.findMany({
      where: { businessId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
    }),
    prisma.appointment.count({ where: { businessId, status: "CONFIRMADO" } }),
    prisma.contact.count({ where: { businessId } }),
    getBusinessInsights(businessId),
  ]);

  const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour: String(hour).padStart(2, "0"),
    count: 0,
    afterHours: hour < OPEN_HOUR || hour >= CLOSE_HOUR,
  }));

  let afterHoursConversations = 0;
  let conversationsWithMessages = 0;

  for (const conv of conversations) {
    const first = conv.messages[0];
    if (!first) continue;
    conversationsWithMessages += 1;
    const hour = new Date(first.createdAt).getHours();
    hourBuckets[hour].count += 1;
    if (hour < OPEN_HOUR || hour >= CLOSE_HOUR) afterHoursConversations += 1;
  }

  const afterHoursPct = conversationsWithMessages
    ? Math.round((afterHoursConversations / conversationsWithMessages) * 100)
    : 0;

  const scheduledCount = conversations.filter((c) => c.status === "AGENDOU").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-1">Painel</h1>
        <p className="text-sm text-2 mt-1">O que a IA fez enquanto voce estava fora.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Conversas atendidas" value={String(conversations.length)} />
        <StatCard
          label="Agendamentos"
          value={String(appointmentsCount)}
          hint={`${scheduledCount} conversas fecharam`}
        />
        <StatCard label="Leads capturados" value={String(contactsCount)} />
        <StatCard
          label="Fora do horario"
          value={`${afterHoursPct}%`}
          hint="das conversas comecaram com a loja fechada"
          highlight
        />
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-1">Conversas por horario do dia</h2>
          <span className="text-xs text-3 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] inline-block" />
            fora do horario comercial
          </span>
        </div>
        <p className="text-xs text-2 mb-4">
          Tudo em verde e atendimento que so aconteceu porque a IA nunca dorme.
        </p>
        <HourlyChart data={hourBuckets} />
      </div>

      {/* Gerente virtual: insights que a agenda nao mostra */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold tracking-tight text-1">Seu gerente virtual</h2>
          <span className="text-[10px] uppercase tracking-wider bg-emerald-400/10 text-emerald-500 border border-emerald-400/20 px-2 py-0.5 rounded-full">
            IA
          </span>
        </div>
        <p className="text-sm text-2 mb-4">Leituras do seu negocio que a agenda sozinha nao mostra.</p>

        {!insights.hasData ? (
          <div className="glass rounded-2xl p-6 text-sm text-2">
            Assim que os agendamentos comecarem a acontecer, seu gerente virtual mostra aqui os
            servicos que mais faturam, os melhores horarios, quem esta sumindo e a previsao do mes.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Previsao do mes */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-1 mb-3">Previsao de faturamento do mes</h3>
              <div className="grid grid-cols-3 gap-4">
                <Metric label="Ja faturado" value={formatBRL(insights.forecast.realizedCents)} />
                <Metric label="Agendado (resto do mes)" value={formatBRL(insights.forecast.bookedCents)} />
                <Metric
                  label="Projecao de fechar o mes"
                  value={formatBRL(insights.forecast.projectionCents)}
                  highlight
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Servicos que mais faturam */}
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-1 mb-3">Servicos que mais faturam</h3>
                <ul className="space-y-2">
                  {insights.topServices.map((s, i) => (
                    <li key={s.name} className="flex items-center justify-between text-sm">
                      <span className="text-2">
                        <span className="text-3 mr-2">{i + 1}.</span>
                        {s.name}
                        <span className="text-3 ml-2">({s.count}x)</span>
                      </span>
                      <span className="text-1 font-medium">{formatBRL(s.revenueCents)}</span>
                    </li>
                  ))}
                </ul>
                {(insights.bestWeekday || insights.bestHour) && (
                  <div className="mt-4 pt-3 border-t bd flex gap-6 text-sm">
                    {insights.bestWeekday && (
                      <div>
                        <div className="text-3 text-xs">Dia mais rentavel</div>
                        <div className="text-1 font-medium">
                          {insights.bestWeekday.label}{" "}
                          <span className="text-3 font-normal">
                            ({formatBRL(insights.bestWeekday.revenueCents)})
                          </span>
                        </div>
                      </div>
                    )}
                    {insights.bestHour && (
                      <div>
                        <div className="text-3 text-xs">Horario mais rentavel</div>
                        <div className="text-1 font-medium">
                          {insights.bestHour.label}{" "}
                          <span className="text-3 font-normal">
                            ({formatBRL(insights.bestHour.revenueCents)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Clientes prestes a sumir */}
              <div className="glass rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-1 mb-1">Clientes prestes a sumir</h3>
                <p className="text-xs text-3 mb-3">Sem voltar ha mais de 30 dias e sem novo horario marcado.</p>
                {insights.churnRisk.length === 0 ? (
                  <div className="text-sm text-2">Ninguem em risco agora. 🎉</div>
                ) : (
                  <ul className="space-y-2">
                    {insights.churnRisk.map((c) => (
                      <li key={c.phone} className="flex items-center justify-between text-sm">
                        <span className="text-2">
                          {c.name}
                          <span className="text-3 ml-2">ult.: {c.lastService}</span>
                        </span>
                        <span className="text-amber-500 text-xs whitespace-nowrap">
                          ha {c.daysAway} dias
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-3">{label}</div>
      <div
        className={`text-xl font-semibold mt-1 tracking-tight ${
          highlight
            ? "bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent"
            : "text-1"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`glass rounded-2xl p-4 relative overflow-hidden ${highlight ? "border-emerald-400/30" : ""}`}>
      {highlight && (
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
      )}
      <div className="text-xs text-2">{label}</div>
      <div
        className={`text-3xl font-semibold mt-1 tracking-tight ${
          highlight
            ? "bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent"
            : "text-1"
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-3 mt-1">{hint}</div>}
    </div>
  );
}
