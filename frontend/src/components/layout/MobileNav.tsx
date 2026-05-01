"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, History, Settings } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "NEW", icon: Plus },
    { href: "/history", label: "HISTORY", icon: History },
    { href: "/settings", label: "SETTINGS", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#080808] border-t border-[rgba(255,255,255,0.04)] md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-4 transition-colors ${
                isActive ? "text-[#00D9FF]" : "text-[#484848]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-mono text-[9px] uppercase tracking-[0.08em]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
