import { requireBusiness } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PROVIDER_META } from "@/lib/calendar";
import { isWhatsappConnected } from "@/lib/whatsapp";
import { d360Configured } from "@/lib/whatsapp/onboarding";
import {
  disconnectCalendarAction,
  generateIcsTokenAction,
  revokeIcsTokenAction,
  disconnectWhatsappAction,
} from "@/app/actions/integration-actions";
import { updateWhatsappAction } from "@/app/actions/business-actions";
import CopyField from "./CopyField";

const OK_MESSAGES: Record<string, string> = {
  google_conectado: "Google Calendar conectado com sucesso.",
  whatsapp_conectado: "WhatsApp conectado com sucesso.",
};
const ERROR_MESSAGES: Record<string, string> = {
  google_nao_configurado: "Google Calendar ainda nao foi configurado no servidor (GOOGLE_CLIENT_ID).",
  whatsapp_nao_configurado:
    "A conexao rapida de WhatsApp ainda nao foi configurada no servidor (D360_PARTNER_ID). Use o modo avancado por enquanto.",
  conexao_cancelada: "Conexao cancelada.",
  falha_ao_conectar: "Falha ao conectar. Tente novamente.",
};

export default async function IntegracoesPage({
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

  const connections = await prisma.calendarConnection.findMany({
    where: { businessId },
  });
  const googleConn = connections.find((c) => c.provider === "GOOGLE");
  const googleMeta = PROVIDER_META.find((p) => p.id === "GOOGLE")!;
  const outlookMeta = PROVIDER_META.find((p) => p.id === "OUTLOOK")!;

  const baseUrl = process.env.APP_URL || "http://localhost:3000";
  const icsUrl = business.icsToken ? `${baseUrl}/api/calendar/${business.icsToken}` : null;

  const disconnectGoogle = disconnectCalendarAction.bind(null, businessId, "GOOGLE");
  const genIcs = generateIcsTokenAction.bind(null, businessId);
  const revokeIcs = revokeIcsTokenAction.bind(null, businessId);
  const updateWhatsapp = updateWhatsappAction.bind(null, businessId);
  const disconnectWhatsapp = disconnectWhatsappAction.bind(null, businessId);

  const whatsappOn = isWhatsappConnected(business);
  const whatsappQuickAvailable = d360Configured();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-1">Integracoes</h1>
        <p className="text-sm text-2 mt-1">
          Conecte o WhatsApp e a agenda do negocio. A IA atende no seu numero e checa conflitos
          antes de marcar.
        </p>
      </div>

      {ok && OK_MESSAGES[ok] && (
        <div className="text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
          {OK_MESSAGES[ok]}
        </div>
      )}
      {error && ERROR_MESSAGES[error] && (
        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {ERROR_MESSAGES[error]}
        </div>
      )}

      {/* WhatsApp — a conexao mais importante, no topo */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <WhatsappIcon />
            <div>
              <div className="text-sm font-semibold text-1">WhatsApp</div>
              <div className="text-xs text-2 mt-0.5">
                Conecte o numero que a {business.aiName} vai atender.
              </div>
            </div>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
              whatsappOn
                ? "bg-emerald-400/10 text-emerald-500 border border-emerald-400/25"
                : "bg-soft text-3 bd border"
            }`}
          >
            {whatsappOn ? "Conectado" : "Nao conectado"}
          </span>
        </div>

        {whatsappOn ? (
          <div className="flex items-center justify-between border-t bd pt-4">
            <div className="text-sm text-2">
              Conectado via{" "}
              <span className="text-1">
                {business.whatsappProvider === "D360" ? "360dialog" : "Meta Cloud API"}
              </span>
            </div>
            <form action={disconnectWhatsapp}>
              <button className="btn-ghost text-red-500" type="submit">
                Desconectar
              </button>
            </form>
          </div>
        ) : (
          <div className="border-t bd pt-4 space-y-4">
            {whatsappQuickAvailable ? (
              <div className="space-y-2">
                <a
                  href={`/api/integrations/whatsapp/d360/connect?businessId=${businessId}`}
                  className="btn-primary inline-block w-fit"
                >
                  Conectar WhatsApp
                </a>
                <p className="text-xs text-3">
                  Conexao em 1 clique — voce escolhe o numero e autoriza, sem colar nada.
                </p>
              </div>
            ) : (
              <p className="text-xs text-3">
                A conexao em 1 clique precisa do <code className="text-emerald-500">D360_PARTNER_ID</code>{" "}
                configurado no servidor. Enquanto isso, use o modo avancado abaixo.
              </p>
            )}

            <details className="group">
              <summary className="text-xs text-2 cursor-pointer hover:text-1 select-none">
                Modo avancado — conectar direto pela Meta Cloud API
              </summary>
              <form action={updateWhatsapp} className="grid grid-cols-2 gap-4 mt-3">
                <SmallField
                  label="Phone Number ID"
                  name="whatsappPhoneNumberId"
                  defaultValue={business.whatsappPhoneNumberId ?? ""}
                />
                <SmallField
                  label="Access Token"
                  name="whatsappAccessToken"
                  defaultValue={business.whatsappAccessToken ?? ""}
                />
                <button type="submit" className="btn-ghost col-span-2 w-fit">
                  Salvar credenciais da Meta
                </button>
              </form>
            </details>
          </div>
        )}
      </div>

      {/* Google Calendar */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <GoogleIcon />
            <div>
              <div className="text-sm font-semibold text-1">{googleMeta.label}</div>
              <div className="text-xs text-2 mt-0.5">{googleMeta.description}</div>
            </div>
          </div>
          {googleConn ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-500 border border-emerald-400/25 shrink-0">
              Conectado
            </span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-soft text-3 bd border shrink-0">
              Nao conectado
            </span>
          )}
        </div>

        {googleConn ? (
          <div className="flex items-center justify-between border-t bd pt-4">
            <div className="text-sm text-2">
              Conta: <span className="text-1">{googleConn.accountEmail ?? "conectada"}</span>
            </div>
            <form action={disconnectGoogle}>
              <button className="btn-ghost text-red-500" type="submit">
                Desconectar
              </button>
            </form>
          </div>
        ) : googleMeta.available ? (
          <a href={`/api/integrations/google/connect?businessId=${businessId}`} className="btn-primary inline-block w-fit">
            Conectar Google Calendar
          </a>
        ) : (
          <div className="text-xs text-3 border-t bd pt-4">
            Para habilitar, configure <code className="text-emerald-500">GOOGLE_CLIENT_ID</code> e{" "}
            <code className="text-emerald-500">GOOGLE_CLIENT_SECRET</code> no servidor.
          </div>
        )}
      </div>

      {/* ICS feed */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-1">Link de assinatura (ICS)</div>
            <div className="text-xs text-2 mt-0.5">
              Funciona em qualquer app: Apple Calendar, Google Agenda, Outlook. Somente leitura.
            </div>
          </div>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
              icsUrl
                ? "bg-emerald-400/10 text-emerald-500 border border-emerald-400/25"
                : "bg-soft text-3 bd border"
            }`}
          >
            {icsUrl ? "Ativo" : "Desativado"}
          </span>
        </div>

        {icsUrl ? (
          <div className="space-y-3 border-t bd pt-4">
            <CopyField value={icsUrl} />
            <form action={revokeIcs}>
              <button className="text-xs text-red-500 hover:text-red-400" type="submit">
                Revogar link
              </button>
            </form>
          </div>
        ) : (
          <form action={genIcs} className="border-t bd pt-4">
            <button className="btn-primary" type="submit">
              Gerar link de assinatura
            </button>
          </form>
        )}
      </div>

      {/* Outlook (planned) */}
      <div className="glass rounded-2xl p-5 opacity-60">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-1">{outlookMeta.label}</div>
            <div className="text-xs text-2 mt-0.5">{outlookMeta.description}</div>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-soft text-3 bd border shrink-0">
            Em breve
          </span>
        </div>
      </div>
    </div>
  );
}

function SmallField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-2">{label}</label>
      <input name={name} defaultValue={defaultValue} className="input-app" />
    </div>
  );
}

function WhatsappIcon() {
  return (
    <div className="w-9 h-9 rounded-lg bg-[#25D366] flex items-center justify-center shrink-0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.5 9.5 0 0 1-4.84-1.33l-.35-.2-3.6.94.96-3.5-.23-.36a9.46 9.46 0 0 1-1.45-5.05C2.55 6.74 6.8 2.5 12.06 2.5c2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 0 1 2.77 6.69c0 5.25-4.25 9.53-9.47 9.53z" />
      </svg>
    </div>
  );
}

function GoogleIcon() {
  return (
    <div className="w-9 h-9 rounded-lg bg-white border bd flex items-center justify-center shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
      </svg>
    </div>
  );
}
