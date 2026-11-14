import type { Locator } from "@playwright/test";

/**
 * Attend que React ait hydraté l'élément (propriété interne `__reactFiber…`
 * posée sur le nœud DOM). Sans cela, un clic arrivé trop tôt est mis en file
 * par React 19 puis REJOUÉ après l'hydratation : sur un bouton bascule,
 * un second clic de « réessai » annulerait alors le premier.
 */
export async function hydrated(locator: Locator): Promise<Locator> {
  await locator.waitFor();
  await locator.evaluate(
    (el) =>
      new Promise<void>((resolve) => {
        const check = () =>
          Object.keys(el).some((k) => k.startsWith("__reactFiber")) ? resolve() : setTimeout(check, 50);
        check();
      }),
  );
  return locator;
}
