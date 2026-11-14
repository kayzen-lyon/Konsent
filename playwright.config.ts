import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout.
 *
 * - PLAYWRIGHT_BASE_URL fourni : on teste ce serveur tel quel (serveur de
 *   développement local, prévisualisation Vercel…), sans en lancer un autre.
 * - Sinon : `npm run start` (build de production préalable requis) sur le
 *   port dédié 3100, pour ne jamais entrer en collision avec `next dev` sur 3000.
 */
const E2E_PORT = 3100;
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  // Le serveur de développement compile chaque page à la première visite.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npm run start -- --port ${E2E_PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
