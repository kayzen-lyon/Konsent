"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode } from "./QrCode";
import { EDITOR } from "@/lib/disclaimer";
import { getQr } from "@/lib/contact/qr-generated";

/**
 * Carte de contact numérique.
 *
 * Un `<dialog>` natif, ouvert par `showModal()`. Ce choix n'est pas
 * esthétique : il apporte gratuitement ce qu'une div stylée oblige à
 * réimplémenter — et à réimplémenter mal. Fermeture par Échap, piège de
 * focus, retour du focus au déclencheur, inertie du reste de la page pour les
 * lecteurs d'écran. Ces quatre points sont des critères RGAA, et une
 * modale « maison » les manque presque toujours.
 *
 * Le contenu ne fait que reprendre ce que les mentions légales affichent
 * déjà. Une carte de visite qui divergerait des mentions légales serait un
 * écart relevable sur notre propre site.
 */
export function ContactCard() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // `showModal()` doit être appelé depuis un effet et non au rendu : appelé
  // deux fois de suite, il lève une exception, et React 19 en mode strict
  // rejoue les effets.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  /**
   * Filet de sécurité sur `close`, en écouteur NATIF.
   *
   * `onClose` de React ne se déclenchait jamais ici — l'événement ne remonte
   * pas (`bubbles: false`) et échappait à la délégation. La conséquence
   * n'était pas cosmétique : après une première fermeture, l'état React
   * restait « ouvert », le clic suivant ne changeait donc aucun état, aucun
   * effet ne se rejouait, et le bouton Contact devenait DÉFINITIVEMENT
   * inopérant — en annonçant `aria-expanded="true"` devant une modale fermée.
   *
   * Cet écouteur rattrape les fermetures pilotées par le navigateur. Mais il
   * ne suffit pas : sur certains moteurs, `close` ne se déclenche pas non
   * plus. La fermeture par Échap est donc traitée explicitement plus bas,
   * pour que la correction ne repose sur aucun événement facultatif.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  const reviews = getQr("reviews");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="font-display inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-ink-2 transition hover:bg-surface-high hover:text-flame"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <circle cx="8" cy="11" r="2" />
          <path d="M5 16a3 3 0 0 1 6 0M14 10h4M14 14h3" />
        </svg>
        <span className="sr-only whitespace-nowrap 2xl:not-sr-only">Carte de contact</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="carte-contact-titre"
        // Échap est la seule fermeture que le navigateur déclenche seul. On
        // la traite ici plutôt que d'attendre `close` ou `cancel` : `keydown`
        // remonte, donc React le voit toujours. `preventDefault` empêche la
        // fermeture native, et c'est l'état React qui pilote `close()` par
        // l'effet — un seul chemin, donc aucune désynchronisation possible.
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          // Clic sur le fond : la cible est le <dialog> lui-même, jamais son
          // contenu. C'est la façon la plus simple de fermer au clic extérieur
          // sans écouter le document entier.
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="w-[min(92vw,30rem)] rounded-3xl border border-line bg-surface p-0 text-ink-2 shadow-lg backdrop:bg-ink/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <p className="tech text-[10px] text-accent">Carte de contact</p>
            <h2 id="carte-contact-titre" className="display mt-1 text-xl text-ink-2">
              {EDITOR.tradeName}
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">{EDITOR.legalForm}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="shrink-0 rounded p-1.5 text-muted transition hover:bg-paper hover:text-ink-2"
          >
            {/* Le libellé accessible est porté par le texte masqué, pas par le
                glyphe : « × » est annoncé « multiplication » par certains
                lecteurs d'écran. */}
            <span className="sr-only">Fermer la carte de contact</span>
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <address className="space-y-2 not-italic">
            <p className="text-[14px] leading-relaxed text-ink-2">
              {EDITOR.street}
              <br />
              {EDITOR.postalCode} {EDITOR.city}
            </p>
            <p className="text-[14px]">
              <a href={`tel:${EDITOR.phoneE164}`} className="text-flame hover:underline">
                {EDITOR.phone}
              </a>
            </p>
            <p className="text-[14px]">
              <a href={`mailto:${EDITOR.email}`} className="text-flame hover:underline">
                {EDITOR.email}
              </a>
            </p>
          </address>

          <div className="grid grid-cols-3 gap-3">
            {[
              { code: "site", legende: "Le site" },
              { code: "maps", legende: "Nous situer" },
              { code: "reviews", legende: "Avis Google" },
            ].map((item) => (
              <figure key={item.code} className="space-y-1.5">
                <QrCode code={item.code} size={112} className="w-full rounded-lg ring-1 ring-line" />
                <figcaption className="tech text-center text-[9px] text-muted">
                  {item.legende}
                </figcaption>
              </figure>
            ))}
          </div>

          {/* Dire pourquoi un emplacement est vide vaut mieux que de le
              laisser vide : c'est la même règle que pour les documents
              générés, qui signalent leurs champs manquants au lieu de les
              deviner. */}
          {reviews && reviews.size === 0 ? (
            <p className="rounded-lg border-l-2 border-warn bg-warn-bg px-3 py-2 text-[12px] leading-relaxed text-warn">
              Le QR « avis » exige l&apos;identifiant de fiche Google de
              l&apos;établissement. Il n&apos;est pas deviné : renseignez{" "}
              <code className="font-mono">KONSENT_GOOGLE_PLACE_ID</code> puis relancez{" "}
              <code className="font-mono">npm run build:qr</code>.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <a
              href="/api/vcard"
              download
              className="tech rounded-full bg-flame shadow-md px-4 py-2.5 text-[11px] text-white transition hover:bg-flame-dark"
            >
              Ajouter aux contacts
            </a>
            <a
              href="/mentions-legales"
              className="tech rounded-full border-2 border-flame px-4 py-2.5 text-[11px] text-flame transition hover:bg-surface-high"
            >
              Mentions légales
            </a>
          </div>

          <p className="text-[11px] leading-relaxed text-muted">
            {EDITOR.legalName} · SIREN {EDITOR.siren} · SIRET {EDITOR.siret} · {EDITOR.vatMention}
          </p>
        </div>
      </dialog>
    </>
  );
}
