"use client";

import * as React from "react";
import {
  Root as DialogRoot,
  Trigger as DialogTrigger,
  Portal as DialogPortal,
  Overlay as DialogOverlay,
  Content as DialogContent,
  Close as DialogClose,
} from "@radix-ui/react-dialog";
import { cn } from "@/lib/ui/utils";

const Dialog = DialogRoot;

export interface DialogTriggerProps extends React.ComponentPropsWithoutRef<typeof DialogTrigger> {
  className?: string;
}
const DialogTriggerComp = React.forwardRef<
  React.ElementRef<typeof DialogTrigger>,
  DialogTriggerProps
>(({ className, ...props }, ref) => (
  <DialogTrigger ref={ref} className={cn("text-xs font-mono", className)} {...props} />
));
DialogTriggerComp.displayName = DialogTrigger.displayName;

export interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogContent> {
  className?: string;
}
const DialogContentComp = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  DialogContentProps
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
    <DialogContent
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-700 bg-slate-900 p-6 shadow-lg rounded-xl sm:rounded-2xl",
        className,
      )}
      {...props}
    >
      {children}
      <DialogClose className="absolute right-2 top-2 rounded-sm opacity-50 ring-offset-1 opacity-100 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-1 disabled:pointer-events-none data-[state=open]:accent-cyan-400">
        <span className="font-sans text-slate-300">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
));
DialogContentComp.displayName = DialogContent.displayName;

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}
const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
));
DialogHeader.displayName = "DialogHeader";

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}
const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4", className)}
    {...props}
  />
));
DialogFooter.displayName = "DialogFooter";

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
}
const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-sm font-mono font-semibold text-slate-100", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogTitle.displayName;

export interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
}
const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-slate-400", className)} {...props} />
  ),
);
DialogDescription.displayName = DialogDescription.displayName;

export {
  Dialog,
  DialogTriggerComp as DialogTrigger,
  DialogContentComp as DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
