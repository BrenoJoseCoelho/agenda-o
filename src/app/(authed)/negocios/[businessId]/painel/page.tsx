import { requireBusiness } from "@/lib/access";
import { prisma } from "@/lib/prisma";
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

  const [conversations, appointmentsCount, contactsCount] = await Promise.all([
    prisma.conversation.findMany({
      where: { businessId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
    }),
    prisma.appointment.count({ where: { businessId, status: "CONFIRMADO" } }),
    prisma.contact.count({ where: { businessId } }),
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
