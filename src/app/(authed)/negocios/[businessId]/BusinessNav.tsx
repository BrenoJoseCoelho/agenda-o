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
    <nav className="flex gap-1.5 mt-4 pb-4">
      {TABS.map((tab) => {
        const href = `/negocios/${businessId}/${tab.key}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tab.key}
            href={href}
            className={`text-sm px-4 py-1.5 rounded-full transition-all ${
              active
                ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                : "text-white/45 border border-transparent hover:text-white/85 hover:bg-white/5"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
