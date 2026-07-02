import Link from "next/link";
import RegisterForm from "./RegisterForm";

export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-emerald-600">Atende AI</div>
          <p className="text-sm text-neutral-500 mt-1">
            Nunca mais perca cliente as 22h.
          </p>
        </div>

        <RegisterForm error={error} />

        <p className="text-sm text-neutral-500 text-center mt-4">
          Ja tem conta?{" "}
          <Link href="/login" className="text-emerald-600 font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
