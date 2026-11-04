"use client";

import * as React from "react";
import {
  Root as ScrollAreaRoot,
  Viewport as ScrollAreaViewport,
  Scrollbar as ScrollAreaScrollbar,
  Thumb as ScrollAreaThumb,
} from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/ui/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaRoot>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaRoot>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaRoot
    ref={ref}
    className={cn("w-full h-full", className)}
    {...props}
  >
    <ScrollAreaViewport className="w-full h-full" />
    <ScrollAreaScrollbar className="w-1 bg-slate-800">
      <ScrollAreaThumb className="bg-slate-600 rounded-full border border-transparent" />
    </ScrollAreaScrollbar>
  </ScrollAreaRoot>
));
ScrollArea.displayName = ScrollAreaRoot.displayName;

export interface ScrollBarProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaScrollbar> {
  className?: string;
}
const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaScrollbar>,
  ScrollBarProps
>(({ className, ...props }, ref) => (
  <ScrollAreaScrollbar ref={ref} className={cn("w-1 bg-slate-800", className)} {...props} />
));
ScrollBar.displayName = ScrollAreaScrollbar.displayName;

export interface ScrollViewProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaViewport> {
  className?: string;
}
const ScrollView = React.forwardRef<
  React.ElementRef<typeof ScrollAreaViewport>,
  ScrollViewProps
>(({ className, ...props }, ref) => (
  <ScrollAreaViewport ref={ref} className={cn("w-full h-full", className)} {...props} />
));
ScrollView.displayName = ScrollAreaViewport.displayName;

export { ScrollArea, ScrollBar, ScrollView };
