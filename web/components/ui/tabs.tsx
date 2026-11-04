"use client";

import * as React from "react";
import {
  Root as TabsRoot,
  List as TabsList,
  Trigger as TabsTrigger,
  Content as TabsContent,
} from "@radix-ui/react-tabs";
import { cn } from "@/lib/ui/utils";

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsRoot>,
  React.ComponentPropsWithoutRef<typeof TabsRoot>
>(({ className, ...props }, ref) => (
  <TabsRoot
    ref={ref}
    className={cn("w-full", className)}
    {...props}
  />
));
Tabs.displayName = TabsRoot.displayName;

export interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsList> {
  className?: string;
}
const TabsListComp = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-slate-800/50 p-1 text-slate-400 font-mono text-xs",
      className,
    )}
    {...props}
  />
));
TabsListComp.displayName = TabsList.displayName;

export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsTrigger> {
  className?: string;
}
const TabsTriggerComp = React.forwardRef<
  React.ElementRef<typeof TabsTrigger>,
  React.ComponentPropsWithoutRef<typeof TabsTrigger>
>(({ className, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(
      "flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300 data-[state=active]:border-cyan-500 data-[state=active]:border data-[state=active]:shadow-sm",
      className,
    )}
    {...props}
  />
));
TabsTriggerComp.displayName = TabsTrigger.displayName;

export interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsContent> {
  className?: string;
}
const TabsContentComp = React.forwardRef<
  React.ElementRef<typeof TabsContent>,
  React.ComponentPropsWithoutRef<typeof TabsContent>
>(({ className, ...props }, ref) => (
  <TabsContent
    ref={ref}
    className={cn("mt-2 rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300 font-mono outline-none", className)}
    {...props}
  />
));
TabsContentComp.displayName = TabsContent.displayName;

export { Tabs, TabsListComp as TabsList, TabsTriggerComp as TabsTrigger, TabsContentComp as TabsContent };
