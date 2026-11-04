"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Activity,
  Terminal,
  Bot,
  FileText,
  Settings,
  Link as LinkIcon,
  Menu,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/utils";
import LeftNav from "@/components/intelligence/LeftNav";

type ShellProps = {
  children: React.ReactNode;
};

const NAV_LINKS = [
  { id: "intelligence", label: "Intelligence", href: "/intelligence", icon: Shield },
  { id: "workbench", label: "Workbench", href: "/workbench", icon: Activity },
  { id: "skills", label: "Skills", href: "/skills", icon: Bot },
  { id: "evidence", label: "Evidence", href: "/api/evidence/events", icon: FileText },
  { id: "export", label: "Export", href: "/api/export", icon: LinkIcon },
];

export default function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const active = NAV_LINKS.find((l) => l.href === pathname || (l.href !== "/" && pathname.startsWith(l.href)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300 font-mono">
      <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-cyan-400" />
          <div>
            <span className="text-xs font-bold tracking-tighter text-slate-100 uppercase">DISHA</span>
            <span className="text-[9px] text-slate-500">v6.6 &middot; constitutional</span>
          </div>
        </div>
        <nav className="flex items-center gap-1 px-2 hidden sm:flex">
          {NAV_LINKS.map((l) => {
            const isActive = active?.id === l.id;
            return (
              <Link key={l.id} href={l.href} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors", isActive ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50")}>
                <l.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{l.label}</span>
              </Link>
            );
          })}
          <Link href="/login" className="px-2.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-colors">Sign in</Link>
        </nav>
        <div className="flex items-center gap-2 px-2">
          <Menu size={16} className="text-slate-400 hover:text-slate-100" />
          <HelpCircle size={16} className="text-slate-500 hover:text-slate-300" />
        </div>
      </header>

      <div className="flex pt-14 min-h-screen">
        <LeftNav className="hidden lg:block" />
        <main className="flex-1 w-0 min-w-0 pt-2 lg:pt-4 px-3 lg:px-6 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
