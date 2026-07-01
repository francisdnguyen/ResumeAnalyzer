"use client";

import { UserButton } from "@clerk/nextjs";
import {
  BriefcaseIcon,
  LayoutDashboardIcon,
  SearchIcon,
  SettingsIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/upload", label: "Upload Resume", icon: UploadIcon },
  { href: "/job-analysis", label: "Job Analysis", icon: SearchIcon },
  { href: "/applications", label: "Applications", icon: BriefcaseIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-blue-500 shrink-0" />
          <span className="text-sm font-semibold text-white">Resume Analyzer</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/60"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <UserButton afterSignOutUrl="/" />
      </div>
    </aside>
  );
}
