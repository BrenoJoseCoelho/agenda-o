import Link from "next/link";
import RegisterForm from "./RegisterForm";

export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="glow-emerald w-105 h-105 -top-40 -right-20" />
      <div className="glow-emerald w-80 h-80 bottom-0 left-0 opacity-60" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              Atende AI
            </span>
          </div>
          <p className="text-sm text-white/50 mt-2">Nunca mais perca cliente as 22h.</p>
        </div>

        <RegisterForm error={error} />

        <p className="text-sm text-white/40 text-center mt-4">
          Ja tem conta?{" "}
          <Link href="/login" className="text-emerald-400 font-medium hover:text-emerald-300">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
