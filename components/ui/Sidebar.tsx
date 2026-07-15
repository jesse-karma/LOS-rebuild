"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  emoji: string;
  isActive: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  {
    href: "/",
    label: "Home",
    emoji: "🏠",
    // Home owns the pipeline drill-ins (projects, submissions, KP pages).
    isActive: (p) => !p.startsWith("/admin/limits"),
  },
  {
    href: "/admin/limits",
    label: "Concentration Limits",
    emoji: "🎯",
    isActive: (p) => p.startsWith("/admin/limits"),
  },
];

/** Left nav — shared styling with the other KarmaClub apps (orange pill on the active item). */
export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? "w-14" : "w-60"
      } shrink-0 bg-white border-r border-gray-200 sticky top-14 self-start h-[calc(100vh-3.5rem)] transition-[width] duration-200 hidden sm:flex flex-col`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="p-4 text-gray-400 hover:text-gray-700 self-start transition-colors"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </button>

      <nav className="flex flex-col gap-1 pr-3 pt-1">
        {NAV.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-3 pl-4 py-2.5 rounded-r-full text-sm font-medium transition-colors ${
                active
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="text-base w-5 text-center shrink-0 leading-none">{item.emoji}</span>
              {!collapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
