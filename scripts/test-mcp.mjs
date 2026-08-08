/**
 * Contrôles du serveur MCP.
 *
 * Ce que ces contrôles protègent : un serveur MCP est consommé par un système
 * qui ne lit pas la documentation. Si un outil n'a pas de schéma exploitable,
 * l'agent l'appellera mal ; si une description ne dit pas ce que l'outil ne
 * fait PAS, l'agent extrapolera ; et si un prompt n'impose pas les garde-fous,
 * personne ne les imposera à sa place.
 */
import { TOOLS } from "../mcp/src/tools.ts";
import { PROMPTS, RESOURCES, readResource } from "../mcp/src/prompts.ts";

let failures = 0;
const check = (label, condition, detail) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

/* ---------------------------------------------------------------- outils */

console.log(`Outils (${TOOLS.length})`);

check("le serveur expose 28 outils", TOOLS.length === 28, `${TOOLS.length}`);
check(
  "aucun nom en double",
  new Set(TOOLS.map((t) => t.name)).size === TOOLS.length,
);
check(
  "tous les noms sont préfixés konsent_",
  TOOLS.every((t) => t.name.startsWith("konsent_")),
);
check(
  "aucun nom ne contient de point (incompatible avec certains clients)",
  TOOLS.every((t) => !t.name.includes(".")),
);
check(
  "chaque outil porte une description substantielle",
  TOOLS.every((t) => t.description.length >= 60),
  TOOLS.filter((t) => t.description.length < 60).map((t) => t.name).join(", "),
);
check(
  "chaque schéma est un objet JSON Schema valide",
  TOOLS.every((t) => t.inputSchema && t.inputSchema.type === "object" && t.inputSchema.properties),
);
check(
  "les paramètres requis existent dans les propriétés déclarées",
  TOOLS.every((t) => {
    const req = t.inputSchema.required ?? [];
    const props = Object.keys(t.inputSchema.properties ?? {});
    return req.every((r) => props.includes(r));
  }),
);
check("chaque outil a un gestionnaire", TOOLS.every((t) => typeof t.handler === "function"));

// Un outil sans paramètre requis mais appelé sans argument ne doit pas planter
// silencieusement : il doit lever un message exploitable.
console.log("\nRefus explicites");
const needsUrl = TOOLS.filter((t) => (t.inputSchema.required ?? []).includes("url"));
let refusals = 0;
for (const tool of needsUrl) {
  try {
    await tool.handler({});
    console.error(`  ✗ ${tool.name} n'a pas refusé un appel sans url`);
    failures += 1;
  } catch (error) {
    if (/requis/i.test(error.message)) refusals += 1;
    else {
      console.error(`  ✗ ${tool.name} a levé un message inexploitable : ${error.message}`);
      failures += 1;
    }
  }
}
check(
  `les ${needsUrl.length} outils exigeant une url refusent un appel vide`,
  refusals === needsUrl.length,
  `${refusals}/${needsUrl.length}`,
);

/* ------------------------------------------------------------ ressources */

console.log(`\nRessources (${RESOURCES.length})`);
check("cinq ressources exposées", RESOURCES.length === 5);
check(
  "chaque URI utilise le schéma konsent://",
  RESOURCES.every((r) => r.uri.startsWith("konsent://")),
);
check(
  "une URI inconnue est refusée explicitement",
  await readResource("konsent://inexistant").then(
    () => false,
    (e) => /inconnue/i.test(e.message),
  ),
);

/* --------------------------------------------------------------- prompts */

console.log(`\nPrompts (${PROMPTS.length})`);
check("cinq prompts métier", PROMPTS.length === 5);

for (const prompt of PROMPTS) {
  const text = prompt.build({});
  check(`${prompt.name} — produit un texte sans argument`, text.length > 100);
  check(
    `${prompt.name} — les arguments manquants sont visibles`,
    !prompt.arguments.some((a) => a.required) || /\[[a-z]+\]/.test(text),
  );
}

// Le point central : les garde-fous doivent être transmis à l'agent.
const auditPrompts = PROMPTS.filter((p) => p.name !== "expliquer_une_regle");
check(
  "chaque prompt d'audit interdit de qualifier une infraction",
  auditPrompts.every((p) => /infraction/i.test(p.build({}))),
);
check(
  "chaque prompt d'audit impose de citer les règles non évaluées",
  auditPrompts.every((p) => /scan_coverage/.test(p.build({}))),
);
check(
  "chaque prompt d'audit interdit le plafond légal seul",
  auditPrompts.every((p) => /fourchette/i.test(p.build({}))),
);
check(
  "chaque prompt d'audit rappelle la question des juridictions",
  auditPrompts.every((p) => /juridiction/i.test(p.build({}))),
);

console.log(`\n${failures} échec(s).`);
if (failures > 0) process.exit(1);
