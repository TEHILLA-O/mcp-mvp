import { expect, test } from "@playwright/test";

test("overview chart is backed by a real statistics call", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("14.63%").first()).toBeVisible();
});

test("explorer exports a table for the selected series", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Period" })).toBeVisible();
});
