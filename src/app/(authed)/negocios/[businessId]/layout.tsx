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
  const { businessId } = await params;
  const { business, session } = await requireBusiness(businessId);

  return (
    <div>
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between pt-4">
            <div>
              <div className="text-lg font-semibold text-neutral-900">{business.name}</div>
              {session.user.organizationType === "AGENCIA" && (
                <Link href="/organizacao" className="text-xs text-emerald-600 hover:underline">
                  Trocar cliente
                </Link>
              )}
            </div>
          </div>
          <BusinessNav businessId={business.id} />
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
