import { requireBusiness } from "@/lib/access";
import { updatePlanAction } from "@/app/actions/business-actions";
import { createCheckoutAction, createPortalAction } from "@/app/actions/stripe-actions";
import { stripeConfigured } from "@/lib/stripe";

type PlanKey = "ESSENCIAL" | "PROFISSIONAL" | "ILIMITADO";

const PLANS: {
  key: PlanKey;
  label: string;
  price: string;
  model: string;
  featured?: boolean;
  features: string[];
}[] = [
  {
    key: "ESSENCIAL",
    label: "Essencial",
    price: "R$ 147",
    model: "IA Haiku 4.5",
    features: ["Atendimento + agendamento", "1 numero de WhatsApp", "Personalizacao do Cerebro", "Link de agenda (ICS)"],
  },
  {
    key: "PROFISSIONAL",
    label: "Profissional",
    price: "R$ 247",
    model: "IA Sonnet 5",
    featured: true,
    features: [
      "Tudo do Essencial",
      "Entende audios do cliente",
      "Follow-up de quem sumiu",
      "Google Calendar",
      "Personalizacao completa",
    ],
  },
  {
    key: "ILIMITADO",
    label: "Ilimitado",
    price: "R$ 447",
    model: "IA Opus 4.8 (a melhor)",
    features: ["Tudo do Profissional", "Alto volume", "IA mais inteligente", "Prioridade no suporte"],
  },
];

const OK_MESSAGES: Record<string, string> = {
  assinatura_ativada: "Assinatura ativada! 🎉 Sua conta esta ativa.",
};
const ERROR_MESSAGES: Record<string, string> = {
  checkout_cancelado: "Checkout cancelado. Nenhuma cobranca foi feita.",
  pagamento_indisponivel: "Pagamento ainda nao esta configurado no servidor.",
  sem_assinatura: "Voce ainda nao tem uma assinatura ativa.",
};

export default async function PlanoPage({
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
  const current = business.plan as PlanKey;

  const billingOn = stripeConfigured();
  const hasSubscription = Boolean(business.stripeSubscriptionId);
  const isActive = business.billingStatus === "ATIVO";
  const openPortal = createPortalAction.bind(null, businessId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-1">Plano</h1>
        <p className="text-sm text-2 mt-1">
          O plano define a inteligencia da IA e os recursos. Voce esta no{" "}
          <span className="text-emerald-500 font-medium">
            {PLANS.find((p) => p.key === current)?.label}
          </span>
          {isActive && billingOn ? " (assinatura ativa)" : ""}.
        </p>
      </div>

      {ok && OK_MESSAGES[ok] && (
        <div className="text-sm rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-500 px-4 py-3">
          {OK_MESSAGES[ok]}
        </div>
      )}
      {error && ERROR_MESSAGES[error] && (
        <div className="text-sm rounded-xl border border-rose-400/25 bg-rose-400/10 text-rose-500 px-4 py-3">
          {ERROR_MESSAGES[error]}
        </div>
      )}

      {billingOn && hasSubscription && (
        <form action={openPortal}>
          <button type="submit" className="btn-ghost text-sm">
            Gerenciar assinatura (cartao, faturas, cancelar)
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === current;
          const changeManual = updatePlanAction.bind(null, businessId, plan.key);
          const subscribe = createCheckoutAction.bind(null, businessId, plan.key);
          return (
            <div
              key={plan.key}
              className={`glass rounded-2xl p-5 flex flex-col ${
                plan.featured ? "border-emerald-400/40" : ""
              } ${isCurrent ? "ring-1 ring-emerald-400/50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-1">{plan.label}</span>
                {plan.featured && (
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-400/10 text-emerald-500 border border-emerald-400/25 px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
              </div>

              <div className="mt-2 mb-1">
                <span className="text-2xl font-semibold text-1">{plan.price}</span>
                <span className="text-xs text-2">/mes</span>
              </div>
              <div className="text-xs text-emerald-500 mb-4">{plan.model}</div>

              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-2 flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent && isActive && billingOn ? (
                  <div className="text-center text-xs text-emerald-500 font-medium border border-emerald-400/25 bg-emerald-400/5 rounded-lg py-2">
                    Plano atual
                  </div>
                ) : billingOn ? (
                  <form action={subscribe}>
                    <button type="submit" className={plan.featured ? "btn-primary w-full" : "btn-ghost w-full"}>
                      {hasSubscription ? `Mudar para ${plan.label}` : `Assinar ${plan.label}`}
                    </button>
                  </form>
                ) : isCurrent ? (
                  <div className="text-center text-xs text-emerald-500 font-medium border border-emerald-400/25 bg-emerald-400/5 rounded-lg py-2">
                    Plano atual
                  </div>
                ) : (
                  <form action={changeManual}>
                    <button type="submit" className={plan.featured ? "btn-primary w-full" : "btn-ghost w-full"}>
                      Mudar para {plan.label}
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-3">
        {billingOn
          ? "Pagamento seguro pela Stripe. A troca de plano ajusta a cobranca e a IA automaticamente."
          : "Modo teste: a troca de plano muda a IA na hora, sem cobranca. A cobranca automatica (Stripe) ativa quando as chaves forem configuradas."}
      </p>
    </div>
  );
}
