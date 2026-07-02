import Link from "next/link";
import { loginAction } from "@/app/actions/auth-actions";
import ThemeToggle from "@/app/ThemeToggle";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <div className="glow-emerald w-105 h-105 -top-40 -left-20" />
      <div className="glow-emerald w-80 h-80 bottom-0 right-0" />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              Atende AI
            </span>
          </div>
          <p className="text-sm text-2 mt-2">Seu WhatsApp atende e agenda sozinho, 24h.</p>
        </div>

        <form action={loginAction} className="glass rounded-2xl p-6 space-y-4">
          <h1 className="text-lg font-semibold text-1">Entrar</h1>

          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-body">Email</label>
            <input name="email" type="email" required className="input-app" placeholder="voce@negocio.com" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-body">Senha</label>
            <input name="password" type="password" required className="input-app" placeholder="********" />
          </div>

          <button type="submit" className="btn-primary w-full">
            Entrar
          </button>

          <p className="text-sm text-2 text-center">
            Ainda nao tem conta?{" "}
            <Link href="/registrar" className="text-emerald-500 font-medium hover:text-emerald-400">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
