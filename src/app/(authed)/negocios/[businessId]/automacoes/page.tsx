import { requireBusiness } from "@/lib/access";
import { getAutomationCandidates } from "@/lib/automations";
import {
  updateAutomationsAction,
  runAutomationsNowAction,
} from "@/app/actions/business-actions";

const KIND_LABEL: Record<string, string> = {
  WIN_BACK: "Recuperacao",
  NO_SHOW: "Lembrete",
  IDLE_SLOT: "Horario ocioso",
};
const KIND_STYLE: Record<string, string> = {
  WIN_BACK: "bg-emerald-400/10 text-emerald-500 border border-emerald-400/25",
  NO_SHOW: "bg-sky-400/10 text-sky-500 border border-sky-400/25",
  IDLE_SLOT: "bg-amber-400/10 text-amber-500 border border-amber-400/25",
};

export default async function AutomacoesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId: routeParam } = await params;
  const { business } = await requireBusiness(routeParam);
  const businessId = business.id;
  const candidates = await getAutomationCandidates(business);

  const save = updateAutomationsAction.bind(null, businessId);
  const runNow = runAutomationsNowAction.bind(null, businessId);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-1">Automacoes que geram receita</h1>
        <p className="text-sm text-2 mt-1">
          A IA trabalha sozinha: recupera quem sumiu, reduz falta e enche a agenda. Ligue so o que
          voce quer.
        </p>
      </div>

      <form action={save} className="glass rounded-2xl p-5 space-y-5">
        <div className="space-y-3">
          <ToggleRow
            name="winBackEnabled"
            checked={business.winBackEnabled}
            title="Recuperar cliente que sumiu"
            desc="Reengaja quem demonstrou interesse e nao fechou horario."
          />
          <div className="flex items-center gap-2 pl-1">
            <span className="text-xs text-2">Reengajar apos</span>
            <input name="winBackDays" defaultValue={business.winBackDays} className="input-app !w-16 text-center" />
            <span className="text-xs text-2">dias de silencio</span>
          </div>
          <TemplateField
            name="winBackTemplate"
            value={business.winBackTemplate ?? ""}
            vars="{cliente} {negocio} {assinatura}"
            placeholder="Oi {cliente}! Vi que voce nao fechou seu horario. Quer que eu ja deixe marcado? {assinatura}"
          />
        </div>

        <div className="space-y-3 border-t bd pt-4">
          <ToggleRow
            name="noShowReminderEnabled"
            checked={business.noShowReminderEnabled}
            title="Lembrete anti-falta"
            desc="Confirma o horario no dia anterior para reduzir no-show."
          />
          <TemplateField
            name="noShowTemplate"
            value={business.noShowTemplate ?? ""}
            vars="{cliente} {servico} {horario} {negocio} {assinatura}"
            placeholder="Oi {cliente}! So confirmando seu {servico} {horario}. Ta de pe? {assinatura}"
          />
        </div>

        <div className="space-y-3 border-t bd pt-4">
          <ToggleRow
            name="idleSlotEnabled"
            checked={business.idleSlotEnabled}
            title="Encher horario ocioso"
            desc="Quando a agenda de amanha esta vazia, oferece para clientes recentes."
          />
          <TemplateField
            name="idleSlotTemplate"
            value={business.idleSlotTemplate ?? ""}
            vars="{cliente} {negocio} {assinatura}"
            placeholder="Oi {cliente}! A {negocio} ta com horarios livres amanha. Quer aproveitar? {assinatura}"
          />
        </div>

        <div className="border-t bd pt-4">
          <ToggleRow
            name="clientMemoryEnabled"
            checked={business.clientMemoryEnabled}
            title="Memoria do cliente"
            desc="A IA lembra preferencias e historico de cada cliente entre as conversas."
          />
        </div>

        <button type="submit" className="btn-primary">
          Salvar automacoes
        </button>
      </form>

      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-1">Previa: o que a IA faria agora</h2>
            <p className="text-xs text-2 mt-0.5">
              {candidates.length} mensagem(ns) prontas para sair, com base nas automacoes ligadas.
            </p>
          </div>
          <form action={runNow}>
            <button type="submit" className="btn-ghost">
              Rodar agora
            </button>
          </form>
        </div>

        {candidates.length === 0 ? (
          <div className="text-sm text-2 border-t bd pt-4">
            Nada para enviar no momento. Conforme os clientes conversam e agendam, as oportunidades
            aparecem aqui.
          </div>
        ) : (
          <div className="divide-y divide-app border bd rounded-xl overflow-hidden">
            {candidates.slice(0, 20).map((c, i) => (
              <div key={i} className="p-3 bg-soft space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${KIND_STYLE[c.kind]}`}>
                    {KIND_LABEL[c.kind]}
                  </span>
                  <span className="text-sm font-medium text-1">{c.contactName}</span>
                  <span className="text-xs text-3">{c.phone}</span>
                </div>
                <p className="text-sm text-2">{c.message}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-3 border-t bd pt-3">
          Em producao, isso dispara sozinho de hora em hora (via agendador). Aqui voce ve e testa.
          O envio real acontece quando o WhatsApp estiver conectado.
        </p>
      </div>
    </div>
  );
}

function ToggleRow({
  name,
  checked,
  title,
  desc,
}: {
  name: string;
  checked: boolean;
  title: string;
  desc: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div>
        <div className="text-sm font-medium text-1">{title}</div>
        <div className="text-xs text-2 mt-0.5">{desc}</div>
      </div>
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 w-4 h-4 accent-emerald-500 shrink-0" />
    </label>
  );
}

function TemplateField({
  name,
  value,
  vars,
  placeholder,
}: {
  name: string;
  value: string;
  vars: string;
  placeholder: string;
}) {
  return (
    <div className="pl-1 space-y-1">
      <div className="text-xs text-2">
        Mensagem (deixe vazio para usar o padrao). Variaveis:{" "}
        <code className="text-emerald-500">{vars}</code>
      </div>
      <textarea
        name={name}
        defaultValue={value}
        rows={2}
        placeholder={placeholder}
        className="input-app resize-y text-sm"
      />
    </div>
  );
}
