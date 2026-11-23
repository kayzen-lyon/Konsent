import type { PhaseScreenshot } from "@/lib/engine/types";

/**
 * Preuve visuelle du protocole : ce que voyait le navigateur d'analyse à
 * chaque phase. Les images sont celles de l'archive de preuve signée.
 */
const CAPTIONS: Record<PhaseScreenshot["phase"], { title: string; detail: string }> = {
  A: { title: "Avant tout choix", detail: "Le bandeau tel que le visiteur le découvre." },
  B: { title: "Après refus", detail: "La page après un clic sur le refus." },
  C: { title: "Après acceptation", detail: "La page après un clic sur l'acceptation." },
};

export function PhaseScreenshots({ screenshots }: { screenshots: readonly PhaseScreenshot[] }) {
  if (screenshots.length === 0) return null;
  return (
    <div className="mt-6">
      <p className="tech text-[11px] text-muted">Captures d&apos;écran du navigateur d&apos;analyse</p>
      <ul className="mt-3 grid gap-4 sm:grid-cols-3">
        {screenshots.map((s) => {
          const caption = CAPTIONS[s.phase];
          return (
            <li key={s.phase}>
              <figure className="overflow-hidden rounded-xl bg-surface ring-1 ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- image en data URL, hors de l'optimiseur */}
                <img
                  src={`data:image/jpeg;base64,${s.jpegBase64}`}
                  alt={`Capture de la phase ${s.phase} — ${caption.title.toLowerCase()}`}
                  width={1440}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-[16/10] h-auto w-full object-cover object-top"
                />
                <figcaption className="p-4">
                  <span className="display text-base text-ink-2">
                    Phase {s.phase} · {caption.title}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{caption.detail}</span>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[13px] text-muted">
        Ces captures figurent aussi dans l&apos;archive de preuve signée, avec leur empreinte.
      </p>
    </div>
  );
}
