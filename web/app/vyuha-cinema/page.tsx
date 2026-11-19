import type { Metadata } from "next";
import VyuhaCinema from "@/components/vyuha/VyuhaCinema";

export const metadata: Metadata = {
  title: "VYUHA Defense Universe | DISHA 6.6",
  description: "Explore a cinematic visualization of DISHA 6.6's governed defensive formations. Simulated, proposal-only visualization.",
};

export default function VyuhaCinemaPage() {
  return <VyuhaCinema />;
}
