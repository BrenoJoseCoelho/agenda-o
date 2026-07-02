"use client";

import { useState } from "react";
import { registerAction } from "@/app/actions/auth-actions";

export default function RegisterForm({ error }: { error?: string }) {
  const [orgType, setOrgType] = useState<"DONO" | "AGENCIA">("DONO");

  return (
    <form action={registerAction} className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4 shadow-sm">
      <h1 className="text-lg font-semibold text-neutral-900">Criar conta</h1>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOrgType("DONO")}
          className={`rounded-md border px-3 py-2 text-sm font-medium text-left transition-colors ${
            orgType === "DONO"
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-neutral-300 text-neutral-600"
          }`}
        >
          Sou dono do negocio
        </button>
        <button
          type="button"
          onClick={() => setOrgType("AGENCIA")}
          className={`rounded-md border px-3 py-2 text-sm font-medium text-left transition-colors ${
            orgType === "AGENCIA"
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-neutral-300 text-neutral-600"
          }`}
        >
          Sou agencia
        </button>
      </div>
      <input type="hidden" name="orgType" value={orgType} />

      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700">Seu nome</label>
        <input
          name="name"
          required
          className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700">Email</label>
        <input
          name="email"
          type="email"
          required
          className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700">Senha</label>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700">
          {orgType === "DONO" ? "Nome do seu negocio" : "Nome da sua agencia"}
        </label>
        <input
          name="orgName"
          required
          className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder={orgType === "DONO" ? "Barbearia do Ze" : "Agencia XYZ"}
        />
      </div>

      {orgType === "DONO" && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">Nome do estabelecimento (aparece no WhatsApp)</label>
          <input
            name="businessName"
            required
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Barbearia do Ze"
          />
        </div>
      )}

      {orgType === "AGENCIA" && (
        <p className="text-xs text-neutral-500">
          Depois de criar a conta, voce adiciona os clientes (sub-contas) na aba Organizacao.
        </p>
      )}

      <button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-md py-2 text-sm font-medium transition-colors"
      >
        Criar conta
      </button>
    </form>
  );
}
