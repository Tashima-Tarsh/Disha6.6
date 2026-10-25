import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default: "bg-sky-600 text-white shadow hover:bg-sky-500",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-500",
        outline: "border border-slate-700 bg-slate-900/60 text-slate-200 shadow-sm hover:bg-slate-800 hover:text-white",
        secondary: "bg-slate-800 text-slate-100 shadow-sm hover:bg-slate-700",
        ghost: "hover:bg-slate-800/60 text-slate-300 hover:text-white",
        link: "text-sky-400 underline-offset-4 hover:underline",
        cyber: "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.15)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants, cn };

