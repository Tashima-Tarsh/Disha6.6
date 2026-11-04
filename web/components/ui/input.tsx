"use client";

import * as React from "react";
import { cn } from "@/lib/ui/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className, type, ...props }: InputProps & { type?: string }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
