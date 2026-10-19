import { Search, FolderLock, Network, Activity, Settings2, BookOpen, ShieldCheck, Layers } from "lucide-react";

/** Existing routes only. Shortcuts do not imply runtime availability. */
export const DESKTOP_APPS = [
  { href: "/investigate", label: "Investigate", detail: "Search public sources", icon: Search, color: "sage" },
  { href: "/vault", label: "Evidence vault", detail: "Review stored records", icon: FolderLock, color: "sand" },
  { href: "/workbench", label: "Workbench", detail: "Review a research mission", icon: Layers, color: "clay" },
  { href: "/intelligence", label: "Intelligence", detail: "Explore intelligence records", icon: Network, color: "sage" },
  { href: "/operations", label: "Operations", detail: "Review operational activity", icon: Activity, color: "sand" },
  { href: "/corroboration", label: "Corroboration", detail: "Compare supporting evidence", icon: BookOpen, color: "clay" },
  { href: "/investigate/osint-runtime", label: "Tool runtime", detail: "Check execution evidence", icon: ShieldCheck, color: "sage" },
  { href: "/system", label: "Settings", detail: "System and model settings", icon: Settings2, color: "sand" },
] as const;
