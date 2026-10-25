import { describe, expect, it } from "vitest";
import { buttonVariants } from "../components/ui/button";
import { badgeVariants } from "../components/ui/badge";

describe("shadcn/ui & UI Primitive Integration", () => {
  it("renders button variant classes correctly", () => {
    const cyberBtn = buttonVariants({ variant: "cyber", size: "default" });
    expect(cyberBtn).toContain("bg-cyan-500/10");
    expect(cyberBtn).toContain("text-cyan-300");

    const destructiveBtn = buttonVariants({ variant: "destructive" });
    expect(destructiveBtn).toContain("bg-red-600");
  });

  it("renders badge variant classes correctly", () => {
    const successBadge = badgeVariants({ variant: "success" });
    expect(successBadge).toContain("text-emerald-400");

    const cyanBadge = badgeVariants({ variant: "cyan" });
    expect(cyanBadge).toContain("text-cyan-300");
  });
});

