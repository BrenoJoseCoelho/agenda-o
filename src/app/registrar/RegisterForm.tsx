"use client";

import { useState } from "react";
import { registerAction } from "@/app/actions/auth-actions";

export default function RegisterForm({ error }: { error?: string }) {
  const [orgType, setOrgType] = useState<"DONO" | "AGENCIA">("DONO");

  return (
    <form action={registerAction} className="glass rounded-2xl p-6 space-y-4 shadow-2xl shadow-black/40">
      <h1 className="text-lg font-semibold">Criar conta</h1>

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOrgType("DONO")}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-all ${
            orgType === "DONO"
              ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
          }`}
        >
          Sou dono do negocio
        </button>
        <button
          type="button"
          onClick={() => setOrgType("AGENCIA")}
          className={`rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-all ${
            orgType === "AGENCIA"
              ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              : "border-white/10 bg-white/5 text-white/50 hover:text-white/80"
          }`}
        >
          Sou agencia
        </button>
      </div>
      <input type="hidden" name="orgType" value={orgType} />

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-white/70">Seu nome</label>
        <input name="name" required className="input-dark" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-white/70">Email</label>
        <input name="email" type="email" required className="input-dark" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-white/70">Senha</label>
        <input name="password" type="password" required minLength={6} className="input-dark" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-white/70">
          {orgType === "DONO" ? "Nome do seu negocio" : "Nome da sua agencia"}
        </label>
        <input
          name="orgName"
          required
          className="input-dark"
          placeholder={orgType === "DONO" ? "Barbearia do Ze" : "Agencia XYZ"}
        />
      </div>

      {orgType === "DONO" && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Nome do estabelecimento (aparece no WhatsApp)
          </label>
          <input name="businessName" required className="input-dark" placeholder="Barbearia do Ze" />
        </div>
      )}

      {orgType === "AGENCIA" && (
        <p className="text-xs text-white/40">
          Depois de criar a conta, voce adiciona os clientes (sub-contas) na aba Organizacao.
        </p>
      )}

      <button type="submit" className="btn-primary w-full">
        Criar conta
      </button>
    </form>
  );
}
