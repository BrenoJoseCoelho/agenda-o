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
  NOVA: "bg-blue-50 text-blue-700",
  EM_ATENDIMENTO: "bg-amber-50 text-amber-700",
  AGENDOU: "bg-emerald-50 text-emerald-700",
  PERDIDA: "bg-neutral-100 text-neutral-500",
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
    <div className="grid grid-cols-[300px_1fr] h-[calc(100vh-130px)] border border-neutral-200 rounded-xl overflow-hidden bg-white">
      <div className="border-r border-neutral-200 flex flex-col">
        <div className="p-3 border-b border-neutral-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-700">Conversas</span>
          <button
            onClick={createConversation}
            disabled={creating}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-2.5 py-1.5 font-medium disabled:opacity-50"
          >
            + Nova
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-4 text-sm text-neutral-500">Nenhuma conversa ainda.</div>
          )}
          {conversations.map((c) => {
            const lastMsg = c.messages[c.messages.length - 1];
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${
                  c.id === selectedId ? "bg-emerald-50/60" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-800 truncate">{c.contact.name}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 truncate mt-0.5">
                  {lastMsg ? lastMsg.content : "Sem mensagens ainda"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col">
        {selected ? (
          <>
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-neutral-800">{selected.contact.name}</div>
                <div className="text-xs text-neutral-500">{selected.contact.phone}</div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[selected.status]}`}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#e9edf1]">
              {selected.messages.length === 0 && (
                <div className="text-center text-xs text-neutral-500 mt-6">
                  Digite como se fosse o cliente para testar a {aiName}.
                </div>
              )}
              {selected.messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "CLIENTE" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                      m.sender === "CLIENTE" ? "bg-white text-neutral-800" : "bg-emerald-100 text-emerald-900"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="p-3 border-t border-neutral-200 flex gap-2"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Digite como o cliente..."
                className="flex-1 border border-neutral-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 py-2 text-sm font-medium disabled:opacity-50"
              >
                {sending ? "..." : "Enviar"}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">
            Selecione ou crie uma conversa.
          </div>
        )}
      </div>
    </div>
  );
}
