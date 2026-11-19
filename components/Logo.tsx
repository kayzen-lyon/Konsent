import Image from "next/image";
import embleme from "./brand/embleme-clair.webp";
import emblemeSombre from "./brand/embleme-sombre.webp";

/**
 * Emblème Konsent (K et bouclier, circuits terracotta), servi depuis le
 * site lui-même : aucune ressource externe.
 *
 * `fond` choisit la variante :
 * - `clair`  : K marine, pour un fond clair ;
 * - `sombre` : K blanc, pour un fond marine ;
 * - `auto`   : suit le thème du site (classe `.dark` sur `<html>`), voir
 *   `.logo-auto` dans globals.css.
 *
 * Images en 96 px de haut : nettes en Retina jusqu'à 48 px affichés.
 * Décoratives (`alt=""`) : le nom « Konsent » est toujours écrit à côté.
 */
export function Logo({
  className = "",
  fond = "auto",
}: {
  className?: string;
  fond?: "auto" | "clair" | "sombre";
}) {
  const img = (src: typeof embleme, variant: string) => (
    <Image
      src={src}
      alt=""
      unoptimized
      className={`logo-${variant} h-full w-full object-contain`}
    />
  );
  return (
    <span className={`inline-flex shrink-0 ${fond === "auto" ? "logo-auto" : ""} ${className}`} aria-hidden="true">
      {fond !== "sombre" ? img(embleme, "clair") : null}
      {fond !== "clair" ? img(emblemeSombre, "sombre") : null}
    </span>
  );
}
