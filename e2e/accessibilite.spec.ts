import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * axe-core, WCAG 2.0 / 2.1 niveaux A et AA, sur les pages principales.
 * Seules les violations « serious » et « critical » font échouer le test ;
 * les autres sont journalisées.
 *
 * Animations réduites : les éléments animés (maquette du héros…) sont alors
 * affichés d'emblée. Sans cela, axe ignore ce qui est encore à opacité 0
 * au moment de l'analyse, et le résultat dépend du minutage.
 */
test.use({ reducedMotion: "reduce" });
const PAGES = [
  "/",
  "/outils",
  "/outils/generateur-bandeau",
  "/auto-evaluation",
  "/fonctionnalites",
  "/surveillance",
  "/regles",
  "/tarifs",
  "/contact",
  "/accessibilite",
];

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Violations connues, NON corrigées, présentes sur toutes les pages (en-tête
 * et pied de page communs). Chacune a son test `fixme` ci-dessous, et son
 * nœud est exclu de l'analyse des pages pour que le reste de chaque page
 * reste contrôlé. Une fois le composant corrigé : retirer l'entrée.
 */
const KNOWN: { rule: string; selector: string; detail: string }[] = [];

async function analyze(page: Page, path: string, exclude: readonly string[] = []) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  let builder = new AxeBuilder({ page }).withTags(TAGS);
  for (const selector of exclude) builder = builder.exclude(selector);
  return (await builder.analyze()).violations;
}

type Violations = Awaited<ReturnType<typeof analyze>>;

const describe = (list: Violations) =>
  list
    .map(
      (v) =>
        `[${v.impact}] ${v.id} — ${v.help}\n` +
        v.nodes
          .slice(0, 5)
          .map((n) => `    ${n.target.join(" ")}\n      ${n.failureSummary?.split("\n").join("\n      ")}`)
          .join("\n"),
    )
    .join("\n");

for (const path of PAGES) {
  test(`axe WCAG 2.1 AA : ${path}`, async ({ page }) => {
    const violations = await analyze(
      page,
      path,
      KNOWN.map((k) => k.selector),
    );
    const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const minor = violations.filter((v) => !blocking.includes(v));
    if (minor.length) console.log(`${path} — violations mineures :\n${describe(minor)}`);
    expect(blocking.length, `Violations bloquantes sur ${path} :\n${describe(blocking)}`).toBe(0);
  });
}

for (const known of KNOWN) {
  test(`axe, violation connue : ${known.rule}`, async ({ page }) => {
    test.fixme(true, known.detail);
    const violations = await analyze(page, "/");
    const still = violations.filter((v) => v.id === known.rule);
    expect(still.length, describe(still)).toBe(0);
  });
}
