"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import UserMenu from "./UserMenu";
import NewBadge from "./NewBadge";

const navLinks = [
  {
    href: "/create",
    labelKey: "create" as const,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    labelKey: "myCreations" as const,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/gallery",
    labelKey: "explore" as const,
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
] as const;

export default function SidebarNav() {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");

  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden">
      {/* Nav links */}
      <nav className="space-y-0.5 px-2">
        {navLinks.map(({ href, labelKey, icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-grass/10 text-grass dark:bg-grass/20"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
              ].join(" ")}
            >
              <span className={isActive ? "text-grass" : "text-gray-400 dark:text-gray-500"}>
                {icon}
              </span>
              {t(labelKey)}
              {href === "/gallery" ? <NewBadge className="ml-auto" /> : null}
            </Link>
          );
        })}
      </nav>

      {/* User menu at the bottom */}
      <div className="border-t border-gray-200 px-2 pt-2 pb-2 dark:border-gray-800">
        <UserMenu variant="sidebar" />
      </div>
    </div>
  );
}
