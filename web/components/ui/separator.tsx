import * as React from "react";
import { cn } from "@/lib/ui/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  className?: string;
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

export function Separator({
  className,
  orientation = "horizontal",
  decorative = false,
  ...props
}: SeparatorProps) {
  return (
    <hr
      className={cn(
        "relative flex w-full shrink-0 border-b border-slate-800/50",
        orientation === "vertical" ? "h-full w-px border-b-0 border-r border-slate-800/50" : "",
        className,
      )}
      aria-orientation={orientation}
      aria-hidden={decorative}
      {...props}
    />
  );
}
