import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/sign-out-action";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#07090d]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold tracking-tight bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              Atende AI
            </span>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-sm text-white/50">
              {session.user.organizationName}
              {session.user.organizationType === "AGENCIA" && (
                <span className="ml-2 text-[10px] uppercase tracking-wider bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                  agencia
                </span>
              )}
            </span>
          </div>
          <form action={signOutAction}>
            <button className="text-sm text-white/40 hover:text-white/90 transition-colors" type="submit">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
