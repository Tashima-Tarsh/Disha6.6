import * as React from "react";
import { cn } from "@/lib/ui/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm text-slate-100 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}
export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
}
export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3 className={cn("text-sm font-mono font-semibold tracking-tighter text-slate-100", className)} {...props} />
  );
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
}
export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p className={cn("text-xs text-slate-400 font-mono leading-relaxed", className)} {...props} />
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}
export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}
export function CardFooter({ className, ...props }: CardFooterProps) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
