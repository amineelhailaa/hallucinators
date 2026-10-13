import { defineConfig, devices } from "@playwright/test";
const path = process.env.ROOT_BUILD
  ? "/"
  : process.env.TEST_BASE_PATH || "/hallucinators/";
export default defineConfig({
  testDir: "e2e",
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://127.0.0.1:4173${path}`, trace: "retain-on-failure" },
  webServer: {
    env: { VITE_BASE_PATH: path },
    command: "npm run preview -- --port 4173",
    url: `http://127.0.0.1:4173${path}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
