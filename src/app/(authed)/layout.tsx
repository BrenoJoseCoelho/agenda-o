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
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-emerald-600">Atende AI</span>
            <span className="text-sm text-neutral-500">
              {session.user.organizationName}
              {session.user.organizationType === "AGENCIA" && (
                <span className="ml-2 text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                  agencia
                </span>
              )}
            </span>
          </div>
          <form action={signOutAction}>
            <button className="text-sm text-neutral-500 hover:text-neutral-800" type="submit">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
