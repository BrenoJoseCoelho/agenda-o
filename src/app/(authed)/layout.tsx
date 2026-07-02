import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/sign-out-action";
import ThemeToggle from "@/app/ThemeToggle";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b bd header-bg">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              Atende AI
            </span>
            <span className="h-4 w-px bd border-l" />
            <span className="text-sm text-2">
              {session.user.organizationName}
              {session.user.organizationType === "AGENCIA" && (
                <span className="ml-2 text-[10px] uppercase tracking-wider bg-emerald-400/10 text-emerald-500 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                  agencia
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action={signOutAction}>
              <button className="text-sm text-2 hover:text-1 transition-colors" type="submit">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
