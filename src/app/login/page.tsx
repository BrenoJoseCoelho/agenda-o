import Link from "next/link";
import { loginAction } from "@/app/actions/auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-emerald-600">Atende AI</div>
          <p className="text-sm text-neutral-500 mt-1">
            Seu WhatsApp atende e agenda sozinho.
          </p>
        </div>

        <form action={loginAction} className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4 shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">Entrar</h1>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="voce@negocio.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">Senha</label>
            <input
              name="password"
              type="password"
              required
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-md py-2 text-sm font-medium transition-colors"
          >
            Entrar
          </button>

          <p className="text-sm text-neutral-500 text-center">
            Ainda nao tem conta?{" "}
            <Link href="/registrar" className="text-emerald-600 font-medium">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
