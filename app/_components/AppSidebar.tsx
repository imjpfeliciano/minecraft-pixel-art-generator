import Link from "next/link";
import SidebarNav from "./SidebarNav";

export default function AppSidebar() {
  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Logo */}
      <div className="px-4 py-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-grass text-white transition-colors group-hover:bg-grass-hover">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v10H7V7zm2 2v6h6V9H9z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            mc-pixel
          </span>
        </Link>
      </div>

      {/* Nav + user menu (client) */}
      <SidebarNav />
    </aside>
  );
}
