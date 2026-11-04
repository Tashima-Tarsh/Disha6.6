"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/ui/utils";

export interface SwitchProps extends React.HTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  name?: string;
  id?: string;
  value?: string;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, defaultChecked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? "checked" : "unchecked"}
        disabled={disabled}
        ref={ref}
        className={cn(
          "peer inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-slate-800",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform data-[state=checked]:translate-x-[16px] data-[state=unchecked]:translate-x-[0]",
            disabled && "opacity-50"
          )}
        />
      </button>
    );
  },
);
Switch.displayName = "Switch";

export interface SwitchLabelProps extends React.HTMLAttributes<HTMLLabelElement> {
  className?: string;
}
export function SwitchLabel({ className, ...props }: SwitchLabelProps) {
  return (
    <label className={cn("px-2 py-1 text-xs font-mono font-semibold text-slate-400", className)} {...props} />
  );
}
