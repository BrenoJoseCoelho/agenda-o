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
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Cerebro</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Tudo que a IA sabe sobre o seu negocio. Mude aqui e ela ja responde diferente na aba
          Conversas.
        </p>
      </div>

      <form action={updateAction} className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800">Identidade</h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome do estabelecimento" name="name" defaultValue={business.name} />
          <Field label="Nome da atendente IA" name="aiName" defaultValue={business.aiName} />
        </div>

        <TextAreaField label="Tom de voz" name="tone" defaultValue={business.tone} rows={2} />
        <TextAreaField label="Horario de funcionamento" name="openingHours" defaultValue={business.openingHours} rows={2} />
        <TextAreaField label="Regras (o que a IA NAO pode fazer)" name="rules" defaultValue={business.rules} rows={3} />

        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-4 py-2 text-sm font-medium"
        >
          Salvar configuracao
        </button>
      </form>

      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800">Servicos e precos</h2>

        <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-md">
          {services.length === 0 && (
            <div className="p-4 text-sm text-neutral-500">Nenhum servico cadastrado ainda.</div>
          )}
          {services.map((s) => (
            <form
              key={s.id}
              action={async () => {
                "use server";
                await removeServiceAction(businessId, s.id);
              }}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <div>
                <span className="text-sm font-medium text-neutral-800">{s.name}</span>
                <span className="text-sm text-neutral-500 ml-2">
                  {formatPrice(s.priceCents)} · {s.durationMinutes}min
                </span>
              </div>
              <button type="submit" className="text-xs text-red-500 hover:underline">
                Remover
              </button>
            </form>
          ))}
        </div>

        <form action={addService} className="grid grid-cols-[1fr_120px_100px_auto] gap-2 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">Servico</label>
            <input
              name="name"
              required
              placeholder="Corte masculino"
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">Preco (R$)</label>
            <input
              name="price"
              required
              placeholder="45,00"
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">Min.</label>
            <input
              name="duration"
              defaultValue={30}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="bg-neutral-800 hover:bg-neutral-900 text-white rounded-md px-4 py-2 text-sm font-medium"
          >
            Adicionar
          </button>
        </form>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">Integracao com WhatsApp</h2>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              whatsappConnected ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {whatsappConnected ? "Conectado" : "Nao conectado"}
          </span>
        </div>
        <p className="text-xs text-neutral-500">
          Conecte um numero via WhatsApp Cloud API (Meta) para a {business.aiName} responder no WhatsApp
          real. Ate la, use a aba Conversas para testar. Webhook: <code>/api/whatsapp/webhook</code>.
        </p>
        <form action={updateWhatsapp} className="grid grid-cols-2 gap-4">
          <Field label="Phone Number ID" name="whatsappPhoneNumberId" defaultValue={business.whatsappPhoneNumberId ?? ""} />
          <Field label="Access Token" name="whatsappAccessToken" defaultValue={business.whatsappAccessToken ?? ""} />
          <button
            type="submit"
            className="col-span-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-md px-4 py-2 text-sm font-medium w-fit"
          >
            Salvar integracao
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
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
    <div className="space-y-1">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}
