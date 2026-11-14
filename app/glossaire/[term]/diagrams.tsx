import type { ReactNode } from "react";

/**
 * Schémas des termes clés du glossaire.
 *
 * SVG dessinés à la main, sans bibliothèque : couleurs prises dans les jetons
 * du thème (clair et sombre), texte réel plutôt qu'image, et une alternative
 * textuelle complète (titre + description) pour les lecteurs d'écran. Le
 * schéma illustre la définition, il n'ajoute aucune information absente de
 * la fiche.
 */

type Tone = "neutral" | "flame" | "ok" | "crit";

const BOX: Record<Tone, string> = {
  neutral: "fill-surface-low stroke-line-2",
  flame: "fill-flame-bg stroke-flame",
  ok: "fill-ok-bg stroke-ok",
  crit: "fill-crit-bg stroke-crit",
};

function Box({
  x,
  y,
  w,
  h,
  lines,
  tone = "neutral",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: readonly string[];
  tone?: Tone;
}) {
  const lineH = 17;
  const top = y + h / 2 - ((lines.length - 1) * lineH) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} strokeWidth={1.5} className={BOX[tone]} />
      {lines.map((l, i) => (
        <text
          key={l}
          x={x + w / 2}
          y={top + i * lineH}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={i === 0 ? 14 : 12.5}
          fontWeight={i === 0 ? 700 : 400}
          className="fill-ink-2"
        >
          {l}
        </text>
      ))}
    </g>
  );
}

function Arrow({
  from,
  to,
  label,
  dashed,
}: {
  from: [number, number];
  to: [number, number];
  label?: string;
  dashed?: boolean;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeWidth={1.75}
        strokeDasharray={dashed ? "5 4" : undefined}
        markerEnd="url(#fleche)"
        className="stroke-line-2"
      />
      {label ? (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 8}
          textAnchor="middle"
          fontSize={12}
          className="fill-muted"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Frame({
  id,
  title,
  desc,
  height,
  children,
}: {
  id: string;
  title: string;
  desc: string;
  height: number;
  children: ReactNode;
}) {
  return (
    <svg
      role="img"
      aria-labelledby={`${id}-titre ${id}-desc`}
      viewBox={`0 0 640 ${height}`}
      className="h-auto w-full"
      fontFamily="inherit"
    >
      <title id={`${id}-titre`}>{title}</title>
      <desc id={`${id}-desc`}>{desc}</desc>
      <defs>
        <marker
          id="fleche"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10Z" className="fill-line-2" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

function Consentement() {
  return (
    <Frame
      id="schema-consentement"
      height={250}
      title="Schéma : le parcours du consentement"
      desc="Le visiteur arrive sur le site : aucun traceur non nécessaire n'est déposé. Il fait un choix libre, spécifique, éclairé et univoque. S'il accepte, seuls les traceurs des finalités acceptées sont déposés. S'il refuse, rien n'est déposé. Dans les deux cas, il peut revenir sur son choix aussi facilement qu'il l'a exprimé."
    >
      <Box x={10} y={85} w={150} h={70} lines={["Arrivée", "aucun traceur", "avant le choix"]} />
      <Box
        x={220}
        y={70}
        w={180}
        h={100}
        tone="flame"
        lines={["Choix du visiteur", "libre · spécifique", "éclairé · univoque"]}
      />
      <Box x={460} y={20} w={170} h={70} tone="ok" lines={["Accepte", "seules les finalités", "acceptées"]} />
      <Box x={460} y={150} w={170} h={70} tone="crit" lines={["Refuse", "rien n'est déposé"]} />
      <Arrow from={[160, 120]} to={[218, 120]} />
      <Arrow from={[400, 100]} to={[458, 60]} />
      <Arrow from={[400, 140]} to={[458, 180]} />
      <text x={320} y={238} textAnchor="middle" fontSize={12.5} className="fill-muted">
        Retrait possible à tout moment, aussi simplement que l&apos;accord
      </text>
    </Frame>
  );
}

function Traceur() {
  return (
    <Frame
      id="schema-traceur"
      height={250}
      title="Schéma : ce que recouvre la notion de traceur"
      desc="Le terminal du visiteur est au centre. Quatre techniques y lisent ou y écrivent une information : le cookie, le stockage local, le pixel et l'empreinte du terminal. Toutes relèvent du même régime, celui de l'article 82 de la loi Informatique et Libertés."
    >
      <Box
        x={230}
        y={85}
        w={180}
        h={80}
        tone="flame"
        lines={["Terminal du visiteur", "article 82"]}
      />
      <Box x={10} y={15} w={150} h={55} lines={["Cookie"]} />
      <Box x={480} y={15} w={150} h={55} lines={["Stockage local"]} />
      <Box x={10} y={180} w={150} h={55} lines={["Pixel"]} />
      <Box x={480} y={180} w={150} h={55} lines={["Empreinte", "du terminal"]} />
      <Arrow from={[160, 55]} to={[228, 100]} />
      <Arrow from={[480, 55]} to={[412, 100]} />
      <Arrow from={[160, 200]} to={[228, 155]} />
      <Arrow from={[480, 200]} to={[412, 155]} />
    </Frame>
  );
}

function TransfertHorsUe() {
  return (
    <Frame
      id="schema-transfert"
      height={250}
      title="Schéma : un transfert hors de l'Espace économique européen"
      desc="Dans l'Espace économique européen, le visiteur consulte votre site. La page charge une ressource depuis un serveur situé hors de l'EEE, qui reçoit au minimum l'adresse IP du visiteur : c'est un transfert. Il n'est licite que sur le fondement d'une décision d'adéquation, de garanties appropriées comme les clauses contractuelles types, ou d'une dérogation."
    >
      <rect
        x={10}
        y={10}
        width={330}
        height={170}
        rx={14}
        strokeWidth={1.5}
        strokeDasharray="6 5"
        className="fill-transparent stroke-secondary"
      />
      <text x={24} y={32} fontSize={12} fontWeight={700} className="fill-secondary">
        Espace économique européen
      </text>
      <Box x={30} y={70} w={120} h={70} lines={["Visiteur"]} />
      <Box x={200} y={70} w={120} h={70} lines={["Votre site"]} />
      <Box x={470} y={70} w={160} h={70} tone="flame" lines={["Serveur", "hors EEE"]} />
      <Arrow from={[150, 105]} to={[198, 105]} />
      <Arrow from={[320, 105]} to={[468, 105]} label="adresse IP" />
      <text x={320} y={215} textAnchor="middle" fontSize={12.5} className="fill-ink-2">
        Licite seulement avec : décision d&apos;adéquation · garanties (CCT) · dérogation
      </text>
    </Frame>
  );
}

function InteretLegitime() {
  return (
    <Frame
      id="schema-interet-legitime"
      height={240}
      title="Schéma : où l'intérêt légitime peut, et ne peut pas, servir"
      desc="À gauche, un traitement de données ordinaire peut reposer sur l'une des bases légales du RGPD, dont l'intérêt légitime après mise en balance. À droite, le dépôt d'un traceur non nécessaire relève de l'article 82 : seul le consentement est possible, l'intérêt légitime est exclu."
    >
      <Box x={10} y={15} w={290} h={55} lines={["Traitement de données", "RGPD, article 6"]} />
      <Box x={10} y={110} w={290} h={110} tone="ok" lines={["Plusieurs bases possibles", "contrat · obligation légale", "intérêt légitime", "(après mise en balance)"]} />
      <Box x={340} y={15} w={290} h={55} lines={["Dépôt d'un traceur non nécessaire", "loi 78-17, article 82"]} />
      <Box x={340} y={110} w={290} h={110} tone="crit" lines={["Consentement uniquement", "intérêt légitime exclu"]} />
      <Arrow from={[155, 70]} to={[155, 108]} />
      <Arrow from={[485, 70]} to={[485, 108]} />
    </Frame>
  );
}

function Cmp() {
  return (
    <Frame
      id="schema-cmp"
      height={250}
      title="Schéma : ce que fait une CMP, et ce qu'elle ne vérifie pas"
      desc="La CMP présente l'information au visiteur, enregistre son choix et le diffuse aux balises du site et aux partenaires. Une balise déclenchée en dehors de son contrôle, par exemple avant l'affichage du bandeau ou malgré un refus, lui échappe : la CMP ne le détecte pas."
    >
      <Box x={10} y={80} w={130} h={70} lines={["Visiteur"]} />
      <Box x={200} y={65} w={190} h={100} tone="flame" lines={["CMP", "informe · enregistre", "diffuse le choix"]} />
      <Box x={460} y={20} w={170} h={70} tone="ok" lines={["Balises reliées", "respectent le choix"]} />
      <Box x={460} y={160} w={170} h={70} tone="crit" lines={["Balise hors contrôle", "non détectée"]} />
      <Arrow from={[140, 115]} to={[198, 115]} label="choix" />
      <Arrow from={[390, 95]} to={[458, 60]} />
      <Arrow from={[390, 140]} to={[458, 190]} dashed />
    </Frame>
  );
}

function Tcf() {
  return (
    <Frame
      id="schema-tcf"
      height={230}
      title="Schéma : la circulation d'une chaîne de consentement TCF"
      desc="Le visiteur fait son choix dans la CMP. La CMP l'encode dans une chaîne TC String, qui indique les finalités et les fournisseurs acceptés. Cette chaîne est transmise à chacun des partenaires publicitaires, qui doivent s'y conformer."
    >
      <Box x={10} y={80} w={110} h={70} lines={["Visiteur"]} />
      <Box x={165} y={80} w={110} h={70} lines={["CMP"]} />
      <Box x={320} y={70} w={140} h={90} tone="flame" lines={["TC String", "finalités", "fournisseurs"]} />
      <Box x={510} y={10} w={120} h={55} lines={["Partenaire A"]} />
      <Box x={510} y={88} w={120} h={55} lines={["Partenaire B"]} />
      <Box x={510} y={166} w={120} h={55} lines={["Partenaire C"]} />
      <Arrow from={[120, 115]} to={[163, 115]} />
      <Arrow from={[275, 115]} to={[318, 115]} />
      <Arrow from={[460, 95]} to={[508, 40]} />
      <Arrow from={[460, 115]} to={[508, 115]} />
      <Arrow from={[460, 135]} to={[508, 192]} />
    </Frame>
  );
}

const DIAGRAMS: Record<string, () => ReactNode> = {
  consentement: Consentement,
  traceur: Traceur,
  "transfert-hors-ue": TransfertHorsUe,
  "interet-legitime": InteretLegitime,
  cmp: Cmp,
  tcf: Tcf,
};

export function TermDiagram({ slug }: { slug: string }) {
  const Diagram = DIAGRAMS[slug];
  if (!Diagram) return null;
  return (
    <figure className="mt-8 rounded-xl bg-surface p-4 ring-1 ring-line shadow-md sm:p-6">
      <Diagram />
    </figure>
  );
}
