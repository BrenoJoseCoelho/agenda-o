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
  TRIAL: "bg-amber-50 text-amber-700",
  ATIVO: "bg-emerald-50 text-emerald-700",
  PAUSADO: "bg-neutral-100 text-neutral-600",
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">
          {isAgency ? "Clientes da agencia" : "Sua organizacao"}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {isAgency
            ? `${businesses.length} contas de clientes, ${activeCount} faturando ativamente.`
            : "Gerencie seu negocio."}
        </p>
      </div>

      {isAgency && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Clientes totais" value={String(businesses.length)} />
          <StatCard label="Faturando (ATIVO)" value={String(activeCount)} />
          <StatCard label="Em teste" value={String(businesses.filter((b) => b.billingStatus === "TRIAL").length)} />
        </div>
      )}

      {isAgency && (
        <form
          action={createBusinessAction}
          className="bg-white border border-neutral-200 rounded-xl p-4 flex items-end gap-3"
        >
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium text-neutral-700">Novo cliente</label>
            <input
              name="name"
              required
              placeholder="Nome do estabelecimento do cliente"
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-4 py-2 text-sm font-medium"
          >
            Adicionar cliente
          </button>
        </form>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
        {businesses.length === 0 && (
          <div className="p-8 text-center text-sm text-neutral-500">
            Nenhum negocio cadastrado ainda.
          </div>
        )}
        {businesses.map((b) => (
          <Link
            key={b.id}
            href={`/negocios/${b.id}/painel`}
            className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
          >
            <div>
              <div className="font-medium text-neutral-900">{b.name}</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {b._count.conversations} conversas · {b._count.appointments} agendamentos
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold text-neutral-900 mt-1">{value}</div>
    </div>
  );
}
