import Link from "next/link";
import { loginAction } from "@/app/actions/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div className="glow-emerald w-105 h-105 -top-40 -left-20" />
      <div className="glow-emerald w-80 h-80 bottom-0 right-0 opacity-60" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              Atende AI
            </span>
          </div>
          <p className="text-sm text-white/50 mt-2">
            Seu WhatsApp atende e agenda sozinho, 24h.
          </p>
        </div>

        <form action={loginAction} className="glass rounded-2xl p-6 space-y-4 shadow-2xl shadow-black/40">
          <h1 className="text-lg font-semibold">Entrar</h1>

          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">Email</label>
            <input name="email" type="email" required className="input-dark" placeholder="voce@negocio.com" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">Senha</label>
            <input name="password" type="password" required className="input-dark" placeholder="********" />
          </div>

          <button type="submit" className="btn-primary w-full">
            Entrar
          </button>

          <p className="text-sm text-white/40 text-center">
            Ainda nao tem conta?{" "}
            <Link href="/registrar" className="text-emerald-400 font-medium hover:text-emerald-300">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
