import * as React from "react";
import { cn } from "@/lib/ui/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
}

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn("px-2 py-1.5 text-xs font-mono font-semibold text-slate-400", className)}
      {...props}
    />
  );
}
