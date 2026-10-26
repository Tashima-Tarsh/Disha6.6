import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

export const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-400",
  {
    variants: {
      variant: {
        default: "border border-slate-700 bg-slate-900 text-slate-100",
        success: "border border-emerald-500/30 bg-emerald-950 text-emerald-400",
        cyan: "border border-cyan-500/30 bg-cyan-950 text-cyan-300",
        destructive: "border border-red-500/30 bg-red-950 text-red-400",
        outline: "border border-slate-800 text-slate-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={badgeVariants({ variant, className })} {...props} />;
}
