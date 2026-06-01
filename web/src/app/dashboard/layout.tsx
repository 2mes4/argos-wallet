"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  GitBranch,
  Key,
  Settings,
  LogOut,
  Eye,
} from "lucide-react";
import { ArgosWordmark } from "@/components/logo";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/wallets", label: "Wallets", icon: Wallet },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/rules", label: "Routing Rules", icon: GitBranch },
  { href: "/dashboard/api-keys", label: "API Keys", icon: Key },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const apiKey = localStorage.getItem("argos_api_key");
    if (!apiKey) {
      router.push("/login");
    } else {
      setMounted(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("argos_api_key");
    localStorage.removeItem("argos_tenant");
    router.push("/login");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Eye className="w-8 h-8 text-amber animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-bg-surface border-r border-bg-border flex flex-col fixed h-screen">
        <div className="p-6 border-b border-bg-border">
          <ArgosWordmark />
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? "bg-amber/10 text-amber border border-amber/20"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-bg-elevated border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-bg-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/5 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
