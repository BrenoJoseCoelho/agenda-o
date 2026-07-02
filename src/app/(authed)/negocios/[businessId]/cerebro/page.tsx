import { requireBusiness } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import {
  updateBrainAction,
  addServiceAction,
  removeServiceAction,
  updateWhatsappAction,
} from "@/app/actions/business-actions";

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CerebroPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { business } = await requireBusiness(businessId);
  const services = await prisma.service.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });

  const updateAction = updateBrainAction.bind(null, businessId);
  const addService = addServiceAction.bind(null, businessId);
  const updateWhatsapp = updateWhatsappAction.bind(null, businessId);
  const whatsappConnected = Boolean(business.whatsappPhoneNumberId && business.whatsappAccessToken);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Cerebro</h1>
        <p className="text-sm text-white/45 mt-1">
          Tudo que a IA sabe sobre o seu negocio. Mude aqui e ela ja responde diferente na aba
          Conversas.
        </p>
      </div>

      <form action={updateAction} className="glass rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white/85 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          Identidade
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome do estabelecimento" name="name" defaultValue={business.name} />
          <Field label="Nome da atendente IA" name="aiName" defaultValue={business.aiName} />
        </div>

        <TextAreaField label="Tom de voz" name="tone" defaultValue={business.tone} rows={2} />
        <TextAreaField
          label="Horario de funcionamento"
          name="openingHours"
          defaultValue={business.openingHours}
          rows={2}
        />
        <TextAreaField
          label="Regras (o que a IA NAO pode fazer)"
          name="rules"
          defaultValue={business.rules}
          rows={3}
        />

        <button type="submit" className="btn-primary">
          Salvar configuracao
        </button>
      </form>

      <div className="glass rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white/85 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          Servicos e precos
        </h2>

        <div className="divide-y divide-white/6 border border-white/8 rounded-xl overflow-hidden">
          {services.length === 0 && (
            <div className="p-4 text-sm text-white/40">Nenhum servico cadastrado ainda.</div>
          )}
          {services.map((s) => (
            <form
              key={s.id}
              action={async () => {
                "use server";
                await removeServiceAction(businessId, s.id);
              }}
              className="flex items-center justify-between px-4 py-2.5 bg-white/2"
            >
              <div>
                <span className="text-sm font-medium text-white/90">{s.name}</span>
                <span className="text-sm text-emerald-300/80 ml-2">{formatPrice(s.priceCents)}</span>
                <span className="text-xs text-white/35 ml-2">{s.durationMinutes}min</span>
              </div>
              <button type="submit" className="text-xs text-red-400/80 hover:text-red-300 transition-colors">
                Remover
              </button>
            </form>
          ))}
        </div>

        <form action={addService} className="grid grid-cols-[1fr_120px_90px_auto] gap-2 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Servico</label>
            <input name="name" required placeholder="Corte masculino" className="input-dark" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Preco (R$)</label>
            <input name="price" required placeholder="45,00" className="input-dark" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50">Min.</label>
            <input name="duration" defaultValue={30} className="input-dark" />
          </div>
          <button type="submit" className="btn-ghost">
            Adicionar
          </button>
        </form>
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/85 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            Integracao com WhatsApp
          </h2>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              whatsappConnected
                ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/25"
                : "bg-white/5 text-white/40 border border-white/10"
            }`}
          >
            {whatsappConnected ? "Conectado" : "Nao conectado"}
          </span>
        </div>
        <p className="text-xs text-white/40">
          Conecte um numero via WhatsApp Cloud API (Meta) para a {business.aiName} responder no
          WhatsApp real. Ate la, use a aba Conversas para testar. Webhook:{" "}
          <code className="text-emerald-300/80">/api/whatsapp/webhook</code>.
        </p>
        <form action={updateWhatsapp} className="grid grid-cols-2 gap-4">
          <Field
            label="Phone Number ID"
            name="whatsappPhoneNumberId"
            defaultValue={business.whatsappPhoneNumberId ?? ""}
          />
          <Field
            label="Access Token"
            name="whatsappAccessToken"
            defaultValue={business.whatsappAccessToken ?? ""}
          />
          <button type="submit" className="btn-ghost col-span-2 w-fit">
            Salvar integracao
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-white/70">{label}</label>
      <input name={name} defaultValue={defaultValue} className="input-dark" />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  rows,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-white/70">{label}</label>
      <textarea name={name} defaultValue={defaultValue} rows={rows} className="input-dark resize-y" />
    </div>
  );
}
