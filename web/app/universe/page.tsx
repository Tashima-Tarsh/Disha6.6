import type { Metadata } from "next";

import { OsintUniverseClient } from "./universe-client";

export const metadata: Metadata = {
  title: "OSINT Universe | DISHA 6.6",
  description: "Governed live public-source intelligence universe with connector health and evidence provenance.",
};

export default function UniversePage() {
  return <OsintUniverseClient />;
}
