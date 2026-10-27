import { test, expect } from "@playwright/test";

test("OSIRIS intelligence page loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/intelligence", { waitUntil: "networkidle" });

  // Page should load - HUD is visible
  await expect(page.locator("text=INTELLIGENCE HUD")).toBeVisible();

  // Command bar input with unified search placeholder
  await expect(page.getByPlaceholder(/Unified search/)).toBeVisible();

  // MapLibre initializes without errors (verified by no console errors above)

  // No critical console errors (filter out WebSocket HMR noise and favicon)
  const criticalErrors = errors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("404") &&
      !e.includes("WebSocket connection") &&
      !e.includes("ERR_INVALID_HTTP_RESPONSE"),
  );
  expect(criticalErrors).toHaveLength(0);
});

test("OSIRIS intelligence page responsive on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/intelligence", { waitUntil: "networkidle" });

  // Page should load on mobile
  await expect(page.locator("text=INTELLIGENCE HUD")).toBeVisible();
  await expect(page.getByPlaceholder(/Unified search/)).toBeVisible();

  const criticalErrors = errors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("404") &&
      !e.includes("WebSocket connection") &&
      !e.includes("ERR_INVALID_HTTP_RESPONSE"),
  );
  expect(criticalErrors).toHaveLength(0);
});
