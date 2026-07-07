import { requireSuperAdmin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  PLAN_PRICE_CENTS,
  PLAN_LABEL,
  PLAN_ORDER,
  COST_ASSUMPTIONS,
  formatBRL,
} from "@/lib/pricing";
import { setBillingStatusAction, setPlanAction } from "@/app/actions/admin-actions";
import type { BillingStatus, Plan } from "@/generated/prisma/client";

const STATUS_STYLE: Record<BillingStatus, string> = {
  ATIVO: "bg-emerald-400/10 text-emerald-500 border border-emerald-400/25",
  TRIAL: "bg-amber-400/10 text-amber-500 border border-amber-400/25",
  PAUSADO: "bg-soft text-3 border bd",
};
const STATUS_LABEL: Record<BillingStatus, string> = {
  ATIVO: "Ativo",
  TRIAL: "Teste",
  PAUSADO: "Pausado",
};

export default async function AdminPage() {
  await requireSuperAdmin();

  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: true,
      _count: { select: { conversations: true, appointments: true } },
    },
  });

  const total = businesses.length;
  const active = businesses.filter((b) => b.billingStatus === "ATIVO");
  const trial = businesses.filter((b) => b.billingStatus === "TRIAL").length;
  const paused = businesses.filter((b) => b.billingStatus === "PAUSADO").length;

  // Receita recorrente: soma dos planos das contas ATIVAS.
  const mrrCents = active.reduce((sum, b) => sum + PLAN_PRICE_CENTS[b.plan], 0);

  // Custo estimado: infra fixa + IA por conversa (varia pelo modelo do plano).
  const aiCostCents = businesses.reduce(
    (sum, b) => sum + b._count.conversations * COST_ASSUMPTIONS.aiPerConversationCents[b.plan],
    0
  );
  const costCents = COST_ASSUMPTIONS.fixedMonthlyCents + aiCostCents;
  const profitCents = mrrCents - costCents;
  const marginPct = mrrCents > 0 ? Math.round((profitCents / mrrCents) * 100) : 0;

  const totalConversations = businesses.reduce((s, b) => s + b._count.conversations, 0);
  const totalAppointments = businesses.reduce((s, b) => s + b._count.appointments, 0);

  const perPlan = PLAN_ORDER.map((plan) => {
    const activeOfPlan = active.filter((b) => b.plan === plan);
    return {
      plan,
      activeCount: activeOfPlan.length,
      revenueCents: activeOfPlan.length * PLAN_PRICE_CENTS[plan],
    };
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-1">Painel Master</h1>
          <span className="text-[10px] uppercase tracking-wider bg-emerald-400/10 text-emerald-500 border border-emerald-400/20 px-2 py-0.5 rounded-full">
            só você
          </span>
        </div>
        <p className="text-sm text-2 mt-1">Visão de toda a plataforma: contas, receita e gastos.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Contas ativas"
          value={`${active.length}/${total}`}
          sub={`${trial} em teste · ${paused} pausadas`}
        />
        <Kpi label="Receita mensal (MRR)" value={formatBRL(mrrCents)} sub="recorrente" highlight />
        <Kpi label="Gasto estimado" value={formatBRL(costCents)} sub="infra fixa + IA" />
        <Kpi
          label="Lucro estimado"
          value={formatBRL(profitCents)}
          sub={`margem ${marginPct}%`}
          highlight={profitCents >= 0}
          danger={profitCents < 0}
        />
      </div>

      {/* Receita por plano */}
      <div>
        <h2 className="text-sm font-medium text-1 mb-3">Receita por plano (contas ativas)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {perPlan.map((p) => (
            <div key={p.plan} className="glass rounded-2xl p-5">
              <div className="text-sm text-2">{PLAN_LABEL[p.plan]}</div>
              <div className="text-2xl font-semibold text-1 mt-1">{formatBRL(p.revenueCents)}</div>
              <div className="text-xs text-3 mt-1">
                {p.activeCount} {p.activeCount === 1 ? "conta" : "contas"} ·{" "}
                {formatBRL(PLAN_PRICE_CENTS[p.plan])}/mês
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Uso da plataforma */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Kpi label="Conversas (total)" value={String(totalConversations)} sub="todas as contas" />
        <Kpi label="Agendamentos (total)" value={String(totalAppointments)} sub="todas as contas" />
        <Kpi label="Custo de IA estimado" value={formatBRL(aiCostCents)} sub="soma por conversa" />
      </div>

      {/* Clientes */}
      <div>
        <h2 className="text-sm font-medium text-1 mb-3">Clientes ({total})</h2>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-3 border-b bd">
                  <th className="font-medium px-4 py-3">Negócio</th>
                  <th className="font-medium px-4 py-3">Plano</th>
                  <th className="font-medium px-4 py-3">Status</th>
                  <th className="font-medium px-4 py-3 text-right">Conversas</th>
                  <th className="font-medium px-4 py-3 text-right">Receita</th>
                  <th className="font-medium px-4 py-3 text-right">Custo IA</th>
                  <th className="font-medium px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {businesses.map((b) => {
                  const revenue = b.billingStatus === "ATIVO" ? PLAN_PRICE_CENTS[b.plan] : 0;
                  const aiCost =
                    b._count.conversations * COST_ASSUMPTIONS.aiPerConversationCents[b.plan];
                  return (
                    <tr key={b.id} className="hover-surface transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-1">{b.name}</div>
                        <div className="text-xs text-3">{b.organization.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <PlanSwitch businessId={b.id} current={b.plan} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLE[b.billingStatus]}`}
                        >
                          {STATUS_LABEL[b.billingStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-2">{b._count.conversations}</td>
                      <td className="px-4 py-3 text-right text-1">{formatBRL(revenue)}</td>
                      <td className="px-4 py-3 text-right text-2">{formatBRL(aiCost)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {b.billingStatus !== "ATIVO" && (
                            <StatusButton businessId={b.id} to="ATIVO" label="Ativar" />
                          )}
                          {b.billingStatus === "ATIVO" && (
                            <StatusButton businessId={b.id} to="PAUSADO" label="Pausar" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {total === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-2">
                      Nenhum cliente ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-3 mt-3">
          Gastos são estimativas (infra fixa + custo de IA por conversa). Ajuste as premissas em{" "}
          <code className="text-2">src/lib/pricing.ts</code>. A cobrança automática (Stripe) ainda
          não está ligada — os status aqui são controlados manualmente.
        </p>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-sm text-2">{label}</div>
      <div
        className={`text-2xl font-semibold mt-1 ${
          danger ? "text-rose-500" : highlight ? "text-emerald-500" : "text-1"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-3 mt-1">{sub}</div>}
    </div>
  );
}

function StatusButton({
  businessId,
  to,
  label,
}: {
  businessId: string;
  to: BillingStatus;
  label: string;
}) {
  const action = setBillingStatusAction.bind(null, businessId, to);
  return (
    <form action={action}>
      <button
        type="submit"
        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
          to === "ATIVO"
            ? "border-emerald-400/30 text-emerald-500 hover:bg-emerald-400/10"
            : "bd text-2 hover:text-1 hover-surface"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function PlanSwitch({ businessId, current }: { businessId: string; current: Plan }) {
  return (
    <div className="flex gap-1">
      {PLAN_ORDER.map((plan) => {
        const action = setPlanAction.bind(null, businessId, plan);
        const on = plan === current;
        return (
          <form action={action} key={plan}>
            <button
              type="submit"
              title={PLAN_LABEL[plan]}
              className={`text-[11px] w-6 h-6 rounded-md border transition-colors ${
                on
                  ? "bg-emerald-400/15 text-emerald-500 border-emerald-400/30"
                  : "bd text-3 hover:text-1 hover-surface"
              }`}
            >
              {PLAN_LABEL[plan].charAt(0)}
            </button>
          </form>
        );
      })}
    </div>
  );
}
