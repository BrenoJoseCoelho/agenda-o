"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "painel", label: "Painel" },
  { key: "conversas", label: "Conversas" },
  { key: "cerebro", label: "Cerebro" },
];

export default function BusinessNav({ businessId }: { businessId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 mt-3">
      {TABS.map((tab) => {
        const href = `/negocios/${businessId}/${tab.key}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tab.key}
            href={href}
            className={`text-sm pb-3 border-b-2 transition-colors ${
              active
                ? "border-emerald-600 text-emerald-700 font-medium"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
