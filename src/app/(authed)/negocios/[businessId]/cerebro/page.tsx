import { requireBusiness } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { AUTOMATIONS_ENABLED } from "@/lib/features";
import {
  updateBrainAction,
  addServiceAction,
  removeServiceAction,
} from "@/app/actions/business-actions";
import { setBusinessTypeAction } from "@/app/actions/lodging-actions";
import PersonaPresets from "./PersonaPresets";
import ImportServices from "./ImportServices";

function formatPrice(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function CerebroPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId: routeParam } = await params;
  const { business } = await requireBusiness(routeParam);
  const businessId = business.id;
  const services = await prisma.service.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });

  const updateAction = updateBrainAction.bind(null, businessId);
  const addService = addServiceAction.bind(null, businessId);
  const setServico = setBusinessTypeAction.bind(null, businessId, "SERVICO");
  const setHospedagem = setBusinessTypeAction.bind(null, businessId, "HOSPEDAGEM");
  const isLodging = business.businessType === "HOSPEDAGEM";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-1">Cerebro</h1>
        <p className="text-sm text-2 mt-1">
          Tudo que a IA sabe sobre o seu negocio. Mude aqui e ela ja responde diferente na aba
          Conversas.
        </p>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="text-sm font-semibold text-1 mb-1">Tipo de negocio</div>
        <p className="text-xs text-3 mb-3">
          Servicos = agendamento por horario. Hospedagem = aluguel por temporada (reserva por
          periodo, com sincronizacao do Airbnb).
        </p>
        <div className="flex gap-2">
          <form action={setServico}>
            <button
              type="submit"
              className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
                !isLodging ? "bg-emerald-400/15 text-emerald-500 border-emerald-400/30" : "bd text-2 hover-surface"
              }`}
            >
              Servicos
            </button>
          </form>
          <form action={setHospedagem}>
            <button
              type="submit"
              className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
                isLodging ? "bg-emerald-400/15 text-emerald-500 border-emerald-400/30" : "bd text-2 hover-surface"
              }`}
            >
              Hospedagem
            </button>
          </form>
        </div>
      </div>

      <form action={updateAction} className="glass rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          Identidade
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome do estabelecimento" name="name" defaultValue={business.name} />
          <Field label="Nome da atendente IA" name="aiName" defaultValue={business.aiName} />
        </div>

        <PersonaPresets />

        <TextAreaField label="Tom de voz" name="tone" defaultValue={business.tone} rows={2} />

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Formalidade"
            name="formality"
            defaultValue={business.formality}
            options={[
              { value: "INFORMAL", label: "Informal (amigo)" },
              { value: "NEUTRO", label: "Neutro" },
              { value: "FORMAL", label: "Formal (senhor/senhora)" },
            ]}
          />
          <SelectField
            label="Uso de emoji"
            name="emojiLevel"
            defaultValue={business.emojiLevel}
            options={[
              { value: "NENHUM", label: "Nenhum" },
              { value: "POUCO", label: "Pouco" },
              { value: "BASTANTE", label: "Bastante" },
            ]}
          />
        </div>

        <Field
          label="Assinatura / bordao (opcional)"
          name="signature"
          defaultValue={business.signature ?? ""}
          placeholder="Ex: Qualquer coisa e so chamar!"
        />

        <TextAreaField
          label="Exemplos do seu jeito de responder (opcional) — a IA imita o estilo"
          name="examples"
          defaultValue={business.examples ?? ""}
          rows={4}
          placeholder={"Cliente: quanto e o corte?\nVoce: Fica R$ 45, meu parceiro! Quer que eu ja deixe marcado?"}
        />

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
        <TextAreaField
          label="O que a IA nunca deve dizer (opcional)"
          name="avoid"
          defaultValue={business.avoid ?? ""}
          rows={2}
          placeholder="Ex: nunca fale de politica, nunca prometa desconto"
        />

        <button type="submit" className="btn-primary">
          Salvar configuracao
        </button>
      </form>

      <div className="glass rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          Servicos e precos
        </h2>

        <div className="divide-y divide-app border bd rounded-xl overflow-hidden">
          {services.length === 0 && (
            <div className="p-4 text-sm text-2">Nenhum servico cadastrado ainda.</div>
          )}
          {services.map((s) => (
            <form
              key={s.id}
              action={async () => {
                "use server";
                await removeServiceAction(businessId, s.id);
              }}
              className="flex items-center justify-between px-4 py-2.5 bg-soft"
            >
              <div>
                <span className="text-sm font-medium text-1">{s.name}</span>
                <span className="text-sm text-emerald-500 ml-2">{formatPrice(s.priceCents)}</span>
                <span className="text-xs text-3 ml-2">{s.durationMinutes}min</span>
              </div>
              <button type="submit" className="text-xs text-red-500 hover:text-red-400 transition-colors">
                Remover
              </button>
            </form>
          ))}
        </div>

        <form action={addService} className="grid grid-cols-[1fr_120px_90px_auto] gap-2 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-2">Servico</label>
            <input name="name" required placeholder="Corte masculino" className="input-app" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-2">Preco (R$)</label>
            <input name="price" required placeholder="45,00" className="input-app" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-2">Min.</label>
            <input name="duration" defaultValue={30} className="input-app" />
          </div>
          <button type="submit" className="btn-ghost">
            Adicionar
          </button>
        </form>
      </div>

      <ImportServices businessId={businessId} />

      <p className="text-xs text-3">
        {AUTOMATIONS_ENABLED && (
          <>
            Para ligar recuperacao de clientes, lembretes e memoria, va na aba{" "}
            <span className="text-emerald-500">Automacoes</span>.{" "}
          </>
        )}
        Para conectar WhatsApp e agenda, aba{" "}
        <span className="text-emerald-500">Integracoes</span>.
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-body">{label}</label>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className="input-app" />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  rows,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-body">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        placeholder={placeholder}
        className="input-app resize-y"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-body">{label}</label>
      <select name={name} defaultValue={defaultValue} className="input-app">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
