import { DISCLAIMER_SHORT } from "@/lib/disclaimer";
import { STATUS_LABELS, WATCH_ENTRIES } from "@/lib/regwatch/entries";

/**
 * M12 — Veille exposée par API.
 *
 * Le champ `status` distingue explicitement ce qui est en vigueur de ce qui
 * n'est qu'un projet : c'est la confusion entre les deux qui fait vendre sur
 * ce marché, et c'est exactement ce que nous refusons d'entretenir.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ruleId = params.get("rule");
  const since = params.get("since");

  let entries = WATCH_ENTRIES;
  if (ruleId) entries = entries.filter((e) => e.rules.includes(ruleId.toUpperCase()));
  if (since) {
    const from = Date.parse(since);
    if (Number.isFinite(from)) entries = entries.filter((e) => Date.parse(e.date) >= from);
  }

  return Response.json(
    {
      disclaimer: DISCLAIMER_SHORT,
      statusLabels: STATUS_LABELS,
      count: entries.length,
      entries,
      note: "Les entrées marquées PROPOSED ou CONTESTED ne sont pas du droit applicable et ne doivent fonder aucune décision de conformité.",
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
