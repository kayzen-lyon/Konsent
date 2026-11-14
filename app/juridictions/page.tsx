import type { Metadata } from "next";
import { Disclaimer, SectionTitle } from "@/components/primitives";
import { JURISDICTIONS, partitionForJurisdiction } from "@/lib/jurisdictions";
import { FAMILY_LABELS, RULES } from "@/lib/rulepack";

export const metadata: Metadata = {
  title: "Juridictions couvertes",
  description:
    "Le constat technique est le même partout ; la norme qu'on lui oppose ne l'est pas. Ce que le référentiel Konsent qualifie, juridiction par juridiction, et ce qu'il ne qualifie pas encore.",
};

const REGIME_LABELS = {
  OPT_IN: "Accord préalable",
  OPT_IN_IMPLIED: "Accord, éventuellement implicite",
  OPT_OUT: "Opposition",
} as const;

export default function JurisdictionsPage() {
  const rows = JURISDICTIONS.map((j) => {
    const { applicable, outOfScope } = partitionForJurisdiction(RULES, j.code);
    return { jurisdiction: j, applicable: applicable.length, outOfScope };
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="tech text-[10px] text-accent">Portée</p>
      <h1 className="display mt-2 text-4xl text-ink-2">Juridictions couvertes</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted">
        Un traceur publicitaire déposé avant toute action de l&apos;utilisateur est le même fait
        observé à Lyon, à Montréal ou en Californie. Ce qui change, c&apos;est la norme qu&apos;on
        lui oppose — et, dans deux de ces trois endroits, ce fait n&apos;est pas un écart.
      </p>
      <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted">
        C&apos;est pourquoi Konsent ne publie pas de score « international » unique. Le score est
        calculé pour la juridiction que vous choisissez, et le rapport dit lesquelles de ses
        139 règles sont hors périmètre, avec le motif.
      </p>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            Juridictions couvertes : autorité, régime, règles retenues et qualification
          </caption>
          <thead>
            <tr className="border-b border-slate-300">
              <th scope="col" className="py-3 pr-4 font-medium text-ink-2">Juridiction</th>
              <th scope="col" className="py-3 pr-4 font-medium text-ink-2">Autorité</th>
              <th scope="col" className="py-3 pr-4 font-medium text-ink-2">Régime</th>
              <th scope="col" className="py-3 pr-4 font-medium text-ink-2">Règles retenues</th>
              <th scope="col" className="py-3 font-medium text-ink-2">Qualification</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ jurisdiction: j, applicable }) => (
              <tr key={j.code} className="border-b border-slate-100 align-top">
                <th scope="row" className="py-3 pr-4 font-medium text-ink-2">{j.label}</th>
                <td className="py-3 pr-4 text-muted">{j.authority}</td>
                <td className="py-3 pr-4 text-muted">{REGIME_LABELS[j.regime]}</td>
                <td className="py-3 pr-4 text-muted">
                  {applicable} / {RULES.length}
                </td>
                <td className="py-3">
                  {j.maturity === "qualified" ? (
                    <span className="rounded bg-ok-bg px-2 py-0.5 text-xs text-ok">qualifiée</span>
                  ) : (
                    <span className="rounded bg-warn-bg px-2 py-0.5 text-xs text-warn">
                      indicative
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-14">
        <SectionTitle
          eyebrow="01"
          title="Ce que « indicative » veut dire, sans détour"
          description="Quatre juridictions sur six ne sont pas au même niveau de travail que la France, et nous préférons l'écrire ici plutôt que dans une note de bas de page."
        />
        <div className="mt-6 rounded-lg border border-warn-bg bg-warn-bg/30 p-6 text-[15px] leading-relaxed text-slate-700">
          Seules les qualifications <strong className="text-ink-2">France</strong> et{" "}
          <strong className="text-ink-2">Union européenne</strong> ont été construites à partir des
          textes et de la doctrine de l&apos;autorité compétente. Le Québec, le Canada fédéral, la
          Suisse et la Californie sont qualifiés{" "}
          <strong className="text-ink-2">par analogie de régime</strong>. Ils doivent être validés
          par un juriste de la juridiction concernée avant toute exploitation commerciale — au même
          titre que les gabarits documentaires. Un rapport produit sous ces juridictions porte cet
          avertissement.
        </div>
      </section>

      <section className="mt-14">
        <SectionTitle
          eyebrow="02"
          title="Juridiction par juridiction"
          description="Le fondement retenu, et ce qui sort du périmètre."
        />
        <div className="mt-6 space-y-5">
          {rows.map(({ jurisdiction: j, outOfScope }) => {
            const families = [...new Set(outOfScope.map((o) => o.rule.family))];
            return (
              <div key={j.code} className="rounded-lg border border-slate-200 p-6">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="display text-xl text-ink-2">{j.label}</h3>
                  <span className="tech text-[10px] text-muted">{REGIME_LABELS[j.regime]}</span>
                </div>
                <p className="mt-2 text-sm text-muted">{j.basis}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{j.caveat}</p>
                {outOfScope.length > 0 ? (
                  <p className="mt-3 text-sm text-muted">
                    <strong className="text-ink-2">{outOfScope.length} règles hors périmètre</strong>{" "}
                    — {families.map((f) => FAMILY_LABELS[f]).join(", ")}. Elles restent affichées
                    dans le rapport, avec leur motif.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted">
                    Aucune règle hors périmètre : le référentiel s&apos;applique en entier.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-14">
        <Disclaimer />
      </div>
    </div>
  );
}
