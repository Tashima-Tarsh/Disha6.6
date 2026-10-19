import "maplibre-gl/dist/maplibre-gl.css";
import "./theme-tokens.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "disha6.6 Intelligence Board",
  description: "Evidence-first operational dashboard for disha6.6 Brain.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
