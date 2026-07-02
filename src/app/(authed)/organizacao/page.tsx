import Link from "next/link";
import { requireSession } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { createBusinessAction } from "@/app/actions/business-actions";

const BILLING_LABEL: Record<string, string> = {
  TRIAL: "Teste gratis",
  ATIVO: "Ativo",
  PAUSADO: "Pausado",
};

const BILLING_STYLE: Record<string, string> = {
  TRIAL: "bg-amber-400/10 text-amber-300 border border-amber-400/25",
  ATIVO: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/25",
  PAUSADO: "bg-white/5 text-white/40 border border-white/10",
};

export default async function OrganizacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await requireSession();

  const businesses = await prisma.business.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { conversations: true, appointments: true } },
    },
  });

  const isAgency = session.user.organizationType === "AGENCIA";
  const activeCount = businesses.filter((b) => b.billingStatus === "ATIVO").length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {isAgency ? "Clientes da agencia" : "Sua organizacao"}
        </h1>
        <p className="text-sm text-white/45 mt-1">
          {isAgency
            ? `${businesses.length} contas de clientes, ${activeCount} faturando ativamente.`
            : "Gerencie seu negocio."}
        </p>
      </div>

      {isAgency && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Clientes totais" value={String(businesses.length)} />
          <StatCard label="Faturando (ATIVO)" value={String(activeCount)} highlight />
          <StatCard
            label="Em teste"
            value={String(businesses.filter((b) => b.billingStatus === "TRIAL").length)}
          />
        </div>
      )}

      {isAgency && (
        <form action={createBusinessAction} className="glass rounded-2xl p-4 flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-sm font-medium text-white/70">Novo cliente</label>
            <input
              name="name"
              required
              placeholder="Nome do estabelecimento do cliente"
              className="input-dark"
            />
          </div>
          <button type="submit" className="btn-primary">
            Adicionar cliente
          </button>
        </form>
      )}

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="glass rounded-2xl divide-y divide-white/6 overflow-hidden">
        {businesses.length === 0 && (
          <div className="p-8 text-center text-sm text-white/40">
            Nenhum negocio cadastrado ainda.
          </div>
        )}
        {businesses.map((b) => (
          <Link
            key={b.id}
            href={`/negocios/${b.id}/painel`}
            className="flex items-center justify-between px-5 py-4 hover:bg-white/4 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-600/15 border border-emerald-400/20 flex items-center justify-center text-sm font-semibold text-emerald-200">
                {b.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-white/90 group-hover:text-white transition-colors">
                  {b.name}
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {b._count.conversations} conversas · {b._count.appointments} agendamentos
                </div>
              </div>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${BILLING_STYLE[b.billingStatus]}`}>
              {BILLING_LABEL[b.billingStatus]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`glass rounded-2xl p-4 relative overflow-hidden ${highlight ? "border-emerald-400/30" : ""}`}>
      {highlight && (
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
      )}
      <div className="text-xs text-white/45">{label}</div>
      <div
        className={`text-3xl font-semibold mt-1 tracking-tight ${
          highlight
            ? "bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent"
            : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
