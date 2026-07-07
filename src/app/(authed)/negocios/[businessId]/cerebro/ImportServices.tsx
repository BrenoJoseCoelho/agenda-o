"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkAddServicesAction } from "@/app/actions/business-actions";

type Row = { name: string; priceReais: string; durationMinutes: string };

export default function ImportServices({ businessId }: { businessId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, startSaving] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    setRows(null);
    setLoading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(",")[1] ?? "";
      const res = await fetch(`/api/negocios/${businessId}/servicos/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nao consegui ler a imagem.");
        return;
      }
      setRows(
        (data.services as { name: string; priceCents: number; durationMinutes: number }[]).map((s) => ({
          name: s.name,
          priceReais: (s.priceCents / 100).toFixed(2).replace(".", ","),
          durationMinutes: String(s.durationMinutes),
        }))
      );
    } catch {
      setError("Falha ao enviar a imagem.");
    } finally {
      setLoading(false);
    }
  }

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev && prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    setRows((prev) => prev && prev.filter((_, idx) => idx !== i));
  }

  function save() {
    if (!rows) return;
    const payload = rows.map((r) => ({
      name: r.name.trim(),
      priceCents: Math.round(parseFloat(r.priceReais.replace(",", ".")) * 100),
      durationMinutes: parseInt(r.durationMinutes, 10),
    }));
    startSaving(async () => {
      await bulkAddServicesAction(businessId, payload);
      setRows(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-1">Importar da foto (onboarding rapido)</h3>
          <p className="text-xs text-3 mt-0.5">
            Tire uma foto da sua tabela de precos e a IA cadastra os servicos pra voce.
          </p>
        </div>
        <label className="btn-primary cursor-pointer text-sm whitespace-nowrap">
          {loading ? "Lendo foto..." : "Enviar foto"}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      </div>

      {error && <div className="mt-3 text-sm text-rose-500">{error}</div>}

      {rows && (
        <div className="mt-4">
          <div className="text-xs text-2 mb-2">
            Confira os {rows.length} servicos lidos, ajuste se precisar e confirme.
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={r.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="input-app flex-1 text-sm"
                  placeholder="Servico"
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-3">R$</span>
                  <input
                    value={r.priceReais}
                    onChange={(e) => update(i, { priceReais: e.target.value })}
                    className="input-app w-20 text-sm"
                    inputMode="decimal"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <input
                    value={r.durationMinutes}
                    onChange={(e) => update(i, { durationMinutes: e.target.value })}
                    className="input-app w-14 text-sm"
                    inputMode="numeric"
                  />
                  <span className="text-xs text-3">min</span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-3 hover:text-rose-500 transition-colors px-1"
                  aria-label="Remover"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} disabled={saving || rows.length === 0} className="btn-primary text-sm">
              {saving ? "Salvando..." : `Adicionar ${rows.length} servicos`}
            </button>
            <button onClick={() => setRows(null)} className="btn-ghost text-sm" type="button">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
