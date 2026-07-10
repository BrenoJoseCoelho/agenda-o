"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type FbLoginResponse = { authResponse?: { code?: string } | null };
type FbSdk = {
  init: (o: { appId: string; autoLogAppEvents?: boolean; xfbml?: boolean; version: string }) => void;
  login: (
    cb: (r: FbLoginResponse) => void,
    opts: Record<string, unknown>
  ) => void;
};
declare global {
  interface Window {
    FB?: FbSdk;
    fbAsyncInit?: () => void;
  }
}

// Botao "Conectar WhatsApp" via Meta Embedded Signup (oficial, sem BSP).
export default function MetaSignup({
  businessId,
  appId,
  configId,
  graphVersion,
}: {
  businessId: string;
  appId: string;
  configId: string;
  graphVersion: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // Guarda os ids que a Meta manda por postMessage durante o popup.
  const session = useRef<{ phoneNumberId?: string; wabaId?: string }>({});

  useEffect(() => {
    // Recebe os dados do numero enquanto o popup roda.
    function onMessage(ev: MessageEvent) {
      if (typeof ev.origin === "string" && !ev.origin.endsWith("facebook.com")) return;
      try {
        const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.data) {
          if (data.data.phone_number_id) session.current.phoneNumberId = data.data.phone_number_id;
          if (data.data.waba_id) session.current.wabaId = data.data.waba_id;
        }
      } catch {
        /* mensagem nao relacionada */
      }
    }
    window.addEventListener("message", onMessage);

    // Carrega o SDK do Facebook uma vez.
    if (!window.FB) {
      window.fbAsyncInit = () => {
        window.FB?.init({ appId, autoLogAppEvents: true, xfbml: true, version: graphVersion });
        setReady(true);
      };
      const s = document.createElement("script");
      s.src = "https://connect.facebook.net/en_US/sdk.js";
      s.async = true;
      s.defer = true;
      s.crossOrigin = "anonymous";
      document.body.appendChild(s);
    } else {
      setReady(true);
    }

    return () => window.removeEventListener("message", onMessage);
  }, [appId, graphVersion]);

  function connect() {
    if (!window.FB) return;
    setStatus("connecting");
    setError(null);
    window.FB.login(
      async (response) => {
        const code = response.authResponse?.code;
        const { phoneNumberId, wabaId } = session.current;
        if (!code || !phoneNumberId || !wabaId) {
          setStatus("error");
          setError("Conexao cancelada ou incompleta.");
          return;
        }
        try {
          const res = await fetch(`/api/integrations/whatsapp/meta/finalize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ businessId, code, phoneNumberId, wabaId }),
          });
          const data = await res.json();
          if (!res.ok) {
            setStatus("error");
            setError(data.error || "Falha ao conectar.");
            return;
          }
          router.refresh();
        } catch {
          setStatus("error");
          setError("Falha de rede ao conectar.");
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      }
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={connect}
        disabled={!ready || status === "connecting"}
        className="btn-primary inline-block w-fit disabled:opacity-60"
      >
        {status === "connecting" ? "Conectando..." : "Conectar WhatsApp"}
      </button>
      <p className="text-xs text-3">
        Conexao oficial da Meta em poucos cliques — voce escolhe o numero e autoriza, sem colar
        nada.
      </p>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
