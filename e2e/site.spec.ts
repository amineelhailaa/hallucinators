import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
test("home, lesson tabs and direct refresh", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("#/en");
  await expect(
    page.getByRole("heading", { name: "Stop guessing. See the network." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Start exploring" }).click();
  await expect(
    page.getByRole("heading", { name: "Pixels and channels", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Mathematics" }).click();
  await expect(page.locator(".katex")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pixels and channels", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("all lessons load in three locales", async ({ page }) => {
  test.setTimeout(180000);
  const meta = {
    default: JSON.parse(readFileSync("src/content/metadata.json", "utf8")),
  };
  for (const locale of ["en", "fr", "ar"] as const) {
    for (const lesson of meta.default.lessons) {
      await page.goto(`#/${locale}/course/${lesson.id}`);
      await expect(
        page.getByRole("heading", { name: lesson.title[locale], exact: true }),
      ).toBeVisible();
      await expect(
        page
          .locator("article")
          .getByRole("heading", {
            name:
              locale === "en"
                ? "Worked example"
                : locale === "fr"
                  ? "Exemple calculé"
                  : "مثال محسوب",
            exact: true,
          }),
      ).toBeVisible();
    }
  }
});
test("locale switching preserves a lab and Arabic axes", async ({ page }) => {
  await page.goto("#/en/labs/flatten");
  await page.getByRole("combobox", { name: "Language" }).selectOption("ar");
  await expect(page).toHaveURL(/ar\/labs\/flatten/);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".matrixWrap").first()).toHaveAttribute(
    "dir",
    "ltr",
  );
  await page.getByRole("combobox", { name: "اللغة" }).selectOption("fr");
  await expect(
    page.getByRole("heading", { name: "Passerelle Flatten" }),
  ).toBeVisible();
});
test("real worker training, pause, cancellation and frozen inference", async ({
  page,
}) => {
  await page.goto("#/en/labs/training");
  await expect(
    page.getByRole("button", { name: "Train model", exact: true }),
  ).toBeEnabled();
  await page.getByRole("slider", { name: "Epochs", exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Reset", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Train model", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Train model", exact: true }).click();
  await expect(page.locator(".labStatus")).toContainText("Complete", {
    timeout: 60000,
  });
  await expect(page.locator(".chart")).toBeVisible();
  await page.getByRole("button", { name: "Evaluate held-out test" }).click();
  await expect(
    page.getByRole("heading", { name: "Held-out test results" }),
  ).toBeVisible();
  await page.goto("#/en/labs/inference");
  await page.getByRole("button", { name: "Predict", exact: true }).click();
  await expect(page.getByText("max |Δw| = 0")).toBeVisible();
  await expect(page.locator(".panel")).toContainText("conv2d");
});
test("recorded artifact restores a model and evaluates", async ({ page }) => {
  await page.goto("#/en/labs/training");
  await expect(
    page.getByRole("button", { name: "Load recorded example" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Load recorded example" }).click();
  await expect(page.locator(".labStatus")).toContainText("Recorded run");
  await expect(
    page.getByRole("button", { name: "Evaluate held-out test" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Evaluate held-out test" }).click();
  await expect(
    page.getByRole("heading", { name: "Held-out test results" }),
  ).toBeVisible();
});
test("all labs, responsive layouts and accessible controls", async ({
  page,
}) => {
  const ids = [
    "pixels",
    "neuron",
    "composition",
    "convolution",
    "pooling",
    "flatten",
    "loss",
    "backprop",
    "training",
    "transformations",
    "tasks",
    "inference",
  ];
  for (const id of ids) {
    await page.goto(`#/en/labs/${id}`);
    await expect(page.locator(".labBench")).toBeVisible();
    await expect(page.locator(".labBench")).toHaveCSS("opacity", "1");
    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    const audit = await page.evaluate(
      async () => await (window as any).axe.run(document, {}),
    );
    expect(
      audit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
      id,
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 360, height: 780 });
  for (const locale of ["en", "fr", "ar"]) {
    await page.goto(`#/${locale}`);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
test("glossary finds English terms in Arabic and storage failure is safe", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("disabled");
      },
    });
  });
  await page.goto("#/ar/glossary");
  await page.getByRole("textbox").fill("Flatten");
  await expect(page.locator(".glossaryList article").first()).toBeVisible();
});
test("reduced motion and contrast on home and reading", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["#/en", "#/fr/course/flatten", "#/ar/course/pixels"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    const audit = await new AxeBuilder({ page }).analyze();
    expect(
      audit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
    ).toEqual([]);
  }
});
test("pause, cancel and a new seed reset the experiment", async ({ page }) => {
  await page.goto("#/en/labs/training");
  await expect(
    page.getByRole("button", { name: "Train model", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Train model", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".labStatus")).toContainText("Paused");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".labStatus")).toContainText("Cancelled");
  await page.getByRole("spinbutton", { name: "Seed", exact: true }).fill("9");
  await page
    .getByRole("button", { name: "Reset", exact: true })
    .first()
    .click();
  await expect(page.locator(".labStatus")).toContainText("Ready");
  await expect(page.locator(".empty")).toContainText("Train the model");
});
test("regression trains with a fresh linear head", async ({ page }) => {
  await page.goto("#/en/labs/training");
  await expect(
    page.getByRole("button", { name: "Train model", exact: true }),
  ).toBeEnabled();
  await page.getByRole("combobox", { name: "Task" }).selectOption("regression");
  await page.getByRole("slider", { name: "Epochs", exact: true }).fill("1");
  await page.getByRole("button", { name: "Train model", exact: true }).click();
  await expect(page.locator(".labStatus")).toContainText("Complete", {
    timeout: 60000,
  });
  await page.getByRole("button", { name: "Evaluate held-out test" }).click();
  await expect(
    page.getByText("Mean absolute error", { exact: true }),
  ).toBeVisible();
});
test("transformations inspect actual outputs and preserve numeric ordering", async ({
  page,
}) => {
  await page.goto("#/en/labs/transformations");
  await expect(
    page.getByRole("button", { name: "Predict", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("combobox", { name: "Experiment" })
    .selectOption("rotate");
  await page.getByRole("button", { name: "Predict", exact: true }).click();
  await expect(page.getByText("Up → Right")).toBeVisible();
  await expect(page.locator(".playback")).toContainText("1 / 8");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText(/conv2d/).last()).toBeVisible();
});
test("recorded regression respects selected task and all feature channels are inspectable", async ({
  page,
}) => {
  await page.goto("#/en/labs/training");
  await expect(
    page.getByRole("button", { name: "Load recorded example" }),
  ).toBeEnabled();
  await page.getByRole("combobox", { name: "Task" }).selectOption("regression");
  await page.getByRole("button", { name: "Load recorded example" }).click();
  await expect(page.locator(".labStatus")).toContainText("Recorded run");
  await expect(
    page.getByRole("button", { name: "Evaluate held-out test" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Evaluate held-out test" }).click();
  await expect(
    page.getByText("Mean absolute error", { exact: true }),
  ).toBeVisible();
  await page.goto("#/en/labs/inference");
  await page.getByRole("button", { name: "Predict", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Channel" })).toBeVisible();
  await page.getByRole("combobox", { name: "Channel" }).selectOption("3");
  await expect(
    page
      .locator(".panel")
      .getByRole("button", { name: /Feature map \[0, 0, 3\]/ }),
  ).toBeVisible();
  await expect(page.getByText("max |Δw| = 0")).toBeVisible();
});
test("keyboard navigation preserves tensor coordinates in Arabic", async ({
  page,
}) => {
  await page.goto("#/en/labs/flatten");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skipLink")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await expect(page).toHaveURL(/en\/labs\/flatten/);
  await page.locator(".matrix").first().locator("button").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("[0,1,0] ↔ 2")).toBeVisible();
  await page.getByRole("combobox", { name: "Language" }).selectOption("ar");
  await page.locator(".matrix").first().locator("button").nth(1).focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByText("[1,1,0] ↔ 6")).toBeVisible();
  await page.setViewportSize({ width: 360, height: 780 });
  await expect(page.locator("aside").first()).toBeHidden();
  await page.getByRole("button", { name: "افتح التنقل" }).click();
  await expect(page.locator("aside").first()).toBeVisible();
});
