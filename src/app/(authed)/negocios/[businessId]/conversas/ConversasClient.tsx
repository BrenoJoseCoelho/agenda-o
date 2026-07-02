"use client";

import { useMemo, useState, useRef, useEffect } from "react";

type Message = {
  id: string;
  sender: "CLIENTE" | "IA" | "HUMANO";
  content: string;
  createdAt: string;
};

type Contact = { id: string; name: string; phone: string };

type Conversation = {
  id: string;
  status: "NOVA" | "EM_ATENDIMENTO" | "AGENDOU" | "PERDIDA";
  lastMessageAt: string;
  contact: Contact;
  messages: Message[];
};

const STATUS_LABEL: Record<Conversation["status"], string> = {
  NOVA: "Novo",
  EM_ATENDIMENTO: "Em atendimento",
  AGENDOU: "Agendou",
  PERDIDA: "Perdida",
};

const STATUS_STYLE: Record<Conversation["status"], string> = {
  NOVA: "bg-sky-400/10 text-sky-300 border border-sky-400/25",
  EM_ATENDIMENTO: "bg-amber-400/10 text-amber-300 border border-amber-400/25",
  AGENDOU: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/25",
  PERDIDA: "bg-white/5 text-white/40 border border-white/10",
};

export default function ConversasClient({
  businessId,
  aiName,
  initialConversations,
}: {
  businessId: string;
  aiName: string;
  initialConversations: Conversation[];
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length]);

  async function sendMessage() {
    if (!selected || !draft.trim() || sending) return;
    const content = draft.trim();
    setDraft("");
    setSending(true);

    const optimisticMsg: Message = {
      id: `tmp-${Date.now()}`,
      sender: "CLIENTE",
      content,
      createdAt: new Date().toISOString(),
    };
    setConversations((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, messages: [...c.messages, optimisticMsg] } : c))
    );

    try {
      const res = await fetch(`/api/negocios/${businessId}/conversas/${selected.id}/mensagens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("fail");
      const data = await res.json();

      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === selected.id
              ? {
                  ...c,
                  status: data.status,
                  lastMessageAt: new Date().toISOString(),
                  messages: [
                    ...c.messages.filter((m) => m.id !== optimisticMsg.id),
                    ...data.messages,
                  ],
                }
              : c
          )
          .sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1))
      );
    } catch {
      // keep optimistic message, drop the loading state silently for this demo tool
    } finally {
      setSending(false);
    }
  }

  async function createConversation() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/negocios/${businessId}/conversas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Cliente novo" }),
      });
      const data = await res.json();
      setConversations((prev) => [data.conversation, ...prev]);
      setSelectedId(data.conversation.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid grid-cols-[300px_1fr] h-[calc(100vh-190px)] glass rounded-2xl overflow-hidden">
      <div className="border-r border-white/8 flex flex-col min-h-0">
        <div className="p-3 border-b border-white/8 flex items-center justify-between">
          <span className="text-sm font-semibold text-white/85">Conversas</span>
          <button onClick={createConversation} disabled={creating} className="btn-primary !py-1.5 !px-3 text-xs">
            + Nova
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-4 text-sm text-white/40">Nenhuma conversa ainda.</div>
          )}
          {conversations.map((c) => {
            const lastMsg = c.messages[c.messages.length - 1];
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-3 border-b border-white/5 transition-colors ${
                  c.id === selectedId
                    ? "bg-emerald-400/8 border-l-2 border-l-emerald-400"
                    : "hover:bg-white/4 border-l-2 border-l-transparent"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white/90 truncate">{c.contact.name}</span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[c.status]}`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <div className="text-xs text-white/40 truncate mt-0.5">
                  {lastMsg ? lastMsg.content : "Sem mensagens ainda"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col min-h-0">
        {selected ? (
          <>
            <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between bg-white/2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 border border-emerald-400/20 flex items-center justify-center text-sm font-semibold text-emerald-200">
                  {selected.contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white/90">{selected.contact.name}</div>
                  <div className="text-xs text-white/40">{selected.contact.phone}</div>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[selected.status]}`}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>

            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              style={{
                background:
                  "radial-gradient(circle at 20% 10%, rgba(16,185,129,0.05), transparent 40%), radial-gradient(circle at 80% 90%, rgba(16,185,129,0.04), transparent 40%), #0a0e13",
              }}
            >
              {selected.messages.length === 0 && (
                <div className="text-center text-xs text-white/35 mt-6">
                  Digite como se fosse o cliente para testar a {aiName}.
                </div>
              )}
              {selected.messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "CLIENTE" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-lg ${
                      m.sender === "CLIENTE"
                        ? "bg-white/8 text-white/90 border border-white/8 rounded-bl-sm"
                        : "bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 text-emerald-50 border border-emerald-400/20 rounded-br-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm px-3.5 py-2.5 bg-emerald-500/10 border border-emerald-400/15">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300/70 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300/70 animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300/70 animate-bounce [animation-delay:240ms]" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="p-3 border-t border-white/8 flex gap-2 bg-white/2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Digite como o cliente..."
                className="input-dark !rounded-full flex-1"
              />
              <button type="submit" disabled={sending || !draft.trim()} className="btn-primary !rounded-full !px-5">
                {sending ? "..." : "Enviar"}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-white/40">
            Selecione ou crie uma conversa.
          </div>
        )}
      </div>
    </div>
  );
}
