import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.organizationType === "AGENCIA") {
    redirect("/organizacao");
  }

  const business = await prisma.business.findFirst({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "asc" },
  });

  if (!business) redirect("/organizacao");

  redirect(`/negocios/${business.slug}/painel`);
}
