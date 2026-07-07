import Link from "next/link";
import { requireBusiness } from "@/lib/access";
import BusinessNav from "./BusinessNav";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId: routeParam } = await params;
  const { business, session } = await requireBusiness(routeParam);

  return (
    <div>
      <div className="border-b bd">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between pt-5">
            <div>
              <div className="text-xl font-semibold tracking-tight text-1">{business.name}</div>
              {session.user.organizationType === "AGENCIA" && (
                <Link
                  href="/organizacao"
                  className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  ← Trocar cliente
                </Link>
              )}
            </div>
          </div>
          <BusinessNav businessId={business.slug} lodging={business.businessType === "HOSPEDAGEM"} />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
