/**
 * Écran d'attente d'une analyse (≈ 25 à 40 s en mode navigateur).
 *
 * Honnête avant tout : le serveur ne transmet pas l'avancement réel, donc
 * aucune barre ne prétend mesurer un pourcentage. Ce qui est affiché est
 * vrai : les trois phases tournent EN MÊME TEMPS dans trois navigateurs
 * distincts, le compteur est le temps réellement écoulé, et la liste dit ce
 * que le moteur vérifie. Animations coupées si le visiteur les réduit.
 *
 * Aucun JavaScript : cet écran est le repli d'un Suspense en attente côté
 * serveur, que React n'hydrate qu'une fois le rapport arrivé. Compteur,
 * rotation et message tardif sont donc en CSS (voir `globals.css`).
 */

const PHASES_NAVIGATEUR = [
  {
    code: "A",
    title: "Avant tout choix",
    detail: "Le site est chargé sans toucher au bandeau : tout ce qui part déjà est relevé.",
  },
  {
    code: "B",
    title: "Après refus",
    detail: "Le bouton « Refuser » est cliqué : on regarde ce qui continue malgré tout.",
  },
  {
    code: "C",
    title: "Après acceptation",
    detail: "Tout est accepté : inventaire complet des traceurs et de leurs destinataires.",
  },
] as const;

const PHASES_STATIQUE = [
  { code: "1", title: "Document servi", detail: "Lecture du code de la page et des scripts référencés." },
  { code: "2", title: "En-têtes et DNS", detail: "En-têtes de sécurité, chaînes DNS, masquage de traceurs." },
  { code: "3", title: "Pages légales", detail: "Politique de confidentialité, mentions légales, cookies." },
] as const;

const VERIFICATIONS = [
  "Traceurs déposés avant tout consentement",
  "Refus réellement respecté, ou ignoré",
  "Équilibre visuel des boutons accepter et refuser",
  "Chaîne de consentement publicitaire (TCF)",
  "Empreinte du terminal (canvas, WebGL, audio)",
  "Destinataires hors de l'Union européenne",
  "Durée de vie des cookies de mesure",
  "Mentions obligatoires de la politique de confidentialité",
  "Captures d'écran de chaque phase, pour la preuve",
];

export function ScanProgress({ target, headless }: { target: string; headless: boolean }) {
  const phases = headless ? PHASES_NAVIGATEUR : PHASES_STATIQUE;
  const host = (() => {
    try {
      return new URL(target).host;
    } catch {
      return target;
    }
  })();
  const lateAfterSeconds = headless ? 50 : 20;

  return (
    <div className="mx-auto max-w-5xl px-5 py-14" role="status" aria-busy="true">
      <p className="tech text-[12px] text-flame">Analyse en cours</p>
      <h1 className="display mt-2 break-all text-3xl text-ink-2 sm:text-4xl">{host}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        {headless
          ? "Trois navigateurs travaillent en même temps sur votre site. Comptez environ une minute."
          : "Analyse du document servi, sans navigateur. Quelques secondes."}
      </p>

      {/* Les trois phases, toutes en cours */}
      <ol className="mt-8 grid gap-4 md:grid-cols-3">
        {phases.map((p) => (
          <li key={p.code} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flame font-display text-sm font-bold text-on-primary"
              >
                {p.code}
              </span>
              <span className="display text-lg text-ink-2">{p.title}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{p.detail}</p>
            <div aria-hidden="true" className="scan-track mt-4 h-1.5 overflow-hidden rounded-full bg-line">
              <span className="scan-bar block h-full w-1/3 rounded-full bg-flame" />
            </div>
          </li>
        ))}
      </ol>

      {/* Ce qui est vérifié, au fil de l'eau */}
      <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="tech text-[12px] text-muted">Le moteur vérifie notamment</p>
          <div aria-hidden="true" className="scan-rotate mt-1 grid">
            {VERIFICATIONS.map((v, i) => (
              <p
                key={v}
                className="font-display text-[16px] font-semibold text-ink-2"
                style={{ animationDelay: `${i * 3}s` }}
              >
                {v}
              </p>
            ))}
          </div>
        </div>
        <p aria-hidden="true" className="shrink-0 font-mono text-sm text-muted">
          <span className="scan-counter tabular text-2xl font-bold text-ink-2" /> s écoulées
        </p>
      </div>

      <p
        className="scan-late mt-4 text-sm leading-relaxed text-muted"
        style={{ animationDelay: `${lateAfterSeconds}s` }}
      >
        C&apos;est un peu plus long que d&apos;habitude : le site est lourd ou lent à répondre. Nous
        continuons ; si l&apos;analyse en navigateur n&apos;aboutit pas, le rapport l&apos;indiquera et
        vous proposera de la relancer.
      </p>

      <p className="sr-only">
        Analyse de {host} en cours. {headless ? "Comptez environ une minute." : "Quelques secondes."}
      </p>
    </div>
  );
}
