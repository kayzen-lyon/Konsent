import { expect, test } from "@playwright/test";
import { hydrated } from "./hydration";

/**
 * Parcours clés. Chaque interaction attend l'hydratation de l'élément visé
 * (cf. `hydrated`) : le serveur de développement peut mettre plusieurs
 * secondes à hydrater, et un clic prématuré serait rejoué plus tard.
 */

test("accueil : le formulaire d'audit refuse une adresse vide ou incomplète", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const field = page.getByLabel("Adresse du site à analyser").first();
  const submit = page.getByRole("button", { name: "Lancer l'audit gratuit" }).first();

  await (await hydrated(submit)).click();
  await expect(page.getByRole("alert").filter({ hasText: "Indiquez l'adresse" })).toBeVisible();
  await expect(field).toHaveAttribute("aria-invalid", "true");

  await field.fill("exemple");
  await submit.click();
  await expect(page.getByRole("alert").filter({ hasText: "il manque un nom de domaine" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test("palette de commandes : Ctrl+K ouvre, la recherche répond, Échap ferme", async ({ page }) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Recherche et actions rapides" });

  // Le raccourci est écouté par le composant de la palette, monté dans l'en-tête.
  await hydrated(page.getByRole("button", { name: "Rechercher" }));
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();

  const combobox = dialog.getByRole("combobox");
  await expect(combobox).toBeFocused();
  await expect(dialog.getByRole("listbox", { name: "Actions rapides" })).toBeVisible();
  await expect(dialog.getByRole("option", { name: /Générateur de bandeau/ })).toBeVisible();

  await combobox.fill("cookie");
  const results = dialog.getByRole("listbox", { name: "Résultats de recherche" });
  await expect(results).toBeVisible();
  // Au moins un résultat réel en plus de l'entrée « Voir tous les résultats ».
  await expect(results.getByRole("option").nth(1)).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("menu Outils : s'ouvre, liste les outils, Échap rend le focus au bouton", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  const button = nav.getByRole("button", { name: "Outils gratuits" });

  await (await hydrated(button)).click();
  await expect(button).toHaveAttribute("aria-expanded", "true");

  await expect(nav.getByRole("link", { name: /Générateur de bandeau/ })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Tous les outils →" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("bascule de thème : sombre puis clair, mémorisé au rechargement", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/\bdark\b/);

  await (await hydrated(page.getByRole("button", { name: "Passer en mode sombre" }))).click();
  await expect(html).toHaveClass(/\bdark\b/);

  await page.reload();
  await expect(html).toHaveClass(/\bdark\b/);

  await (await hydrated(page.getByRole("button", { name: "Passer en mode clair" }))).click();
  await expect(html).not.toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(html).not.toHaveClass(/\bdark\b/);
});

test("outil : le générateur de bandeau s'affiche avec son aperçu et son code", async ({ page }) => {
  await page.goto("/outils/generateur-bandeau");
  await expect(page.getByRole("heading", { level: 1, name: /Générateur de bandeau/ })).toBeVisible();
  await expect(page.getByRole("form", { name: "Configuration" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aperçu en direct" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Votre code" })).toBeVisible();
});

test("outil : l'auto-évaluation s'affiche", async ({ page }) => {
  await page.goto("/auto-evaluation");
  await expect(page.getByRole("heading", { level: 1, name: /Auto-évaluation/ })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
});

test("404 : page dédiée avec suggestions", async ({ page }) => {
  const response = await page.goto("/cette-page-n-existe-pas");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Cette page n'existe pas." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Pages suggérées" })).toBeVisible();
});
