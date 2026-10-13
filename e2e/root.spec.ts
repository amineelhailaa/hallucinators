import { test, expect } from "@playwright/test";
test("root hosting loads assets and direct lesson links", async ({ page }) => {
  test.skip(!process.env.ROOT_BUILD);
  await page.goto("http://127.0.0.1:4173/#/en/course/flatten");
  await expect(
    page.getByRole("heading", { name: "Flatten preserves order", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Mathematics" }).click();
  await expect(page.locator(".katex")).toBeVisible();
  await page.goto("http://127.0.0.1:4173/#/en/labs/training");
  await expect(
    page.getByRole("button", { name: "Load recorded example" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Load recorded example" }).click();
  await expect(
    page.getByRole("button", { name: "Evaluate held-out test" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Evaluate held-out test" }).click();
  await expect(
    page.getByRole("heading", { name: "Held-out test results" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("http://127.0.0.1:4173/#/en/labs/inference");
  await page.getByRole("button", { name: "Predict", exact: true }).click();
  await expect(page.getByText("max |Δw| = 0")).toBeVisible();
});
