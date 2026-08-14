"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin/calendario", label: "Caronas", icon: CalendarDays },
  { href: "/admin/passageiros", label: "Passageiros", icon: Users },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/config", label: "Configurações", icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação administrativa"
      className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors md:w-full ${
              isActive
                ? "bg-route text-white shadow-md shadow-route/15"
                : "text-ink-soft hover:bg-route-soft hover:text-route"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={17} strokeWidth={isActive ? 2.4 : 2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
