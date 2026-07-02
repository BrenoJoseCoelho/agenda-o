import { requireBusiness } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PROVIDER_META } from "@/lib/calendar";
import {
  disconnectCalendarAction,
  generateIcsTokenAction,
  revokeIcsTokenAction,
} from "@/app/actions/integration-actions";
import CopyField from "./CopyField";

const OK_MESSAGES: Record<string, string> = {
  google_conectado: "Google Calendar conectado com sucesso.",
};
const ERROR_MESSAGES: Record<string, string> = {
  google_nao_configurado: "Google Calendar ainda nao foi configurado no servidor (GOOGLE_CLIENT_ID).",
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
  const { businessId } = await params;
  const { ok, error } = await searchParams;
  const { business } = await requireBusiness(businessId);

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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-1">Integracoes de agenda</h1>
        <p className="text-sm text-2 mt-1">
          Conecte a agenda do negocio. A IA checa conflitos antes de marcar e joga o agendamento
          direto no calendario.
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
