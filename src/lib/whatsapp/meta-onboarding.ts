// Meta WhatsApp Embedded Signup — o "conectar em poucos cliques" OFICIAL da
// Meta, sem BSP (sem mensalidade tipo 360dialog).
//
// Setup unico da plataforma (feito UMA vez pelo dono do SaaS, como Tech Provider):
//   - Criar um App na Meta + configurar o Embedded Signup -> META_CONFIG_ID
//   - App ID / App Secret -> META_APP_ID / META_APP_SECRET
//   - Verificacao de negocio + App Review das permissoes de WhatsApp
//
// Experiencia do cliente: clica "Conectar WhatsApp" -> popup da Meta -> escolhe
// o numero dele -> pronto. Ele nao cria app nem cola token.

const GRAPH = "https://graph.facebook.com/v21.0";

export function metaEmbeddedConfigured(): boolean {
  return Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_CONFIG_ID
  );
}

// Dados publicos que o componente do navegador precisa para abrir o popup.
export function metaEmbeddedPublicConfig() {
  return {
    appId: process.env.META_APP_ID ?? "",
    configId: process.env.META_CONFIG_ID ?? "",
    graphVersion: "v21.0",
  };
}

export type FinalizeResult =
  | { ok: true; accessToken: string; phoneNumberId: string }
  | { ok: false; error: string };

// Troca o `code` do popup por um token e prepara o numero para o Cloud API:
// 1) code -> business access token
// 2) inscreve nosso app nos webhooks da WABA (mensagens chegam ate nos)
// 3) registra o numero no Cloud API (habilita o envio)
export async function finalizeMetaSignup(params: {
  code: string;
  phoneNumberId: string;
  wabaId: string;
}): Promise<FinalizeResult> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return { ok: false, error: "Meta Embedded Signup nao esta configurado no servidor." };
  }

  try {
    // 1) code -> access token
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(
        params.code
      )}`
    );
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: unknown };
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[meta-signup] token exchange failed:", JSON.stringify(tokenData));
      return { ok: false, error: "Falha ao autorizar com a Meta. Tente novamente." };
    }
    const accessToken = tokenData.access_token;

    // 2) inscreve o app nos webhooks da WABA (best-effort)
    await fetch(`${GRAPH}/${params.wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch((e) => console.error("[meta-signup] subscribe error:", e));

    // 3) registra o numero no Cloud API (PIN de 6 digitos). Best-effort: se o
    // numero ja estiver registrado, seguimos mesmo assim.
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    await fetch(`${GRAPH}/${params.phoneNumberId}/register`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    }).catch((e) => console.error("[meta-signup] register error:", e));

    return { ok: true, accessToken, phoneNumberId: params.phoneNumberId };
  } catch (error) {
    console.error("[meta-signup] finalize error:", error);
    return { ok: false, error: "Erro inesperado ao conectar. Tente novamente." };
  }
}
