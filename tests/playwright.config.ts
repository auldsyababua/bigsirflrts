import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 20_000,
  expect: { timeout: 5_000 },
  use: {
    browserName: "chromium",
    headless: true,
  },
  reporter: [["list"]],
});
