"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface NavLeaf {
  href: string;
  label: string;
  emoji: string;
  isActive: (pathname: string) => boolean;
}

interface NavMenu {
  label: string;
  emoji: string;
  isActive: (pathname: string) => boolean;
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavMenu;

function isMenu(entry: NavEntry): entry is NavMenu {
  return "children" in entry;
}

const NAV: NavEntry[] = [
  {
    href: "/",
    label: "Home",
    emoji: "🏠",
    // Home owns the pipeline overview only; drill-ins each have their own menu now.
    isActive: (p) =>
      !p.startsWith("/admin/limits") &&
      !p.startsWith("/companies") &&
      !p.startsWith("/kp/") &&
      !p.startsWith("/architecture") &&
      !p.startsWith("/projects") &&
      !p.startsWith("/project/") &&
      !p.startsWith("/submission/"),
  },
  {
    href: "/companies",
    label: "Companies",
    emoji: "🏢",
    isActive: (p) => p.startsWith("/companies") || p.startsWith("/kp/"),
  },
  {
    href: "/projects",
    label: "Projects",
    emoji: "📁",
    isActive: (p) => p.startsWith("/projects") || p.startsWith("/project/") || p.startsWith("/submission/"),
  },
  {
    label: "Policies",
    emoji: "📋",
    isActive: (p) => p.startsWith("/admin/limits"),
    children: [
      {
        href: "/admin/limits",
        label: "Concentration Limits",
        emoji: "🎯",
        isActive: (p) => p.startsWith("/admin/limits"),
      },
    ],
  },
  {
    label: "Architecture",
    emoji: "🧬",
    isActive: (p) => p.startsWith("/architecture"),
    children: [
      {
        href: "/architecture/core-object",
        label: "Core Object",
        emoji: "🗺️",
        isActive: (p) => p.startsWith("/architecture/core-object"),
      },
      {
        href: "/architecture/tend-sync",
        label: "Tend ⇄ LOS Sync",
        emoji: "🔄",
        isActive: (p) => p.startsWith("/architecture/tend-sync"),
      },
    ],
  },
];

/** Left nav — shared styling with the other KarmaClub apps (orange pill on the active item). */
export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Set<string>>(
    () => new Set(NAV.filter(isMenu).filter((m) => m.isActive(pathname)).map((m) => m.label))
  );

  const toggleMenu = (label: string) =>
    setOpenMenus((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

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

          if (isMenu(item)) {
            const open = openMenus.has(item.label);
            return (
              <div key={item.label} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleMenu(item.label)}
                  title={item.label}
                  className={`flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-r-full text-sm font-medium transition-colors ${
                    active && !open
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base w-5 text-center shrink-0 leading-none">{item.emoji}</span>
                  {!collapsed && (
                    <>
                      <span className="whitespace-nowrap overflow-hidden flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </button>
                {open &&
                  !collapsed &&
                  item.children.map((child) => {
                    const childActive = child.isActive(pathname);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        title={child.label}
                        className={`flex items-center gap-3 pl-9 py-2 rounded-r-full text-sm font-medium transition-colors ${
                          childActive
                            ? "bg-orange-600 text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <span className="text-sm w-4 text-center shrink-0 leading-none">{child.emoji}</span>
                        <span className="whitespace-nowrap overflow-hidden">{child.label}</span>
                      </Link>
                    );
                  })}
              </div>
            );
          }

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
