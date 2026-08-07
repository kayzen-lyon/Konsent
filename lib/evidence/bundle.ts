import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import { DISCLAIMER_LONG, EDITOR } from "../disclaimer";
import type { ScanResult } from "../engine/types";
import { getRule } from "../rulepack";
import { ZipBuilder } from "./zip";

/**
 * M09 — Archive de preuve.
 *
 * Répond au besoin réel du DPO : non pas savoir, mais POUVOIR PROUVER
 * qu'il a contrôlé, quand, et ce qu'il a constaté.
 *
 * Portée probatoire, dite sans détour : la signature Ed25519 atteste que
 * l'archive a été produite par cette instance et n'a pas été modifiée
 * depuis. Elle n'atteste PAS de la date au sens d'un horodatage qualifié
 * eIDAS, qui suppose un prestataire de services de confiance tiers. Le
 * manifeste le précise, plutôt que de laisser croire l'inverse.
 */

const SIGNATURE_ALGO = "Ed25519";

interface SigningKey {
  privateKey: ReturnType<typeof createPrivateKey>;
  publicKeyPem: string;
  /** false lorsqu'aucune clé n'est configurée : la signature perd sa valeur. */
  production: boolean;
}

let cached: SigningKey | null = null;

/**
 * Clé de signature. En production, `KONSENT_SIGNING_KEY` contient une clé
 * privée Ed25519 au format PKCS#8 PEM encodée en base64.
 *
 * À défaut, une clé éphémère est générée au démarrage : l'archive reste
 * cohérente et vérifiable dans l'absolu, mais la clé publique change à
 * chaque instance. Le manifeste porte alors `production: false` — une
 * archive non rattachable à une clé stable n'a aucune valeur d'opposabilité.
 */
function getSigningKey(): SigningKey {
  if (cached) return cached;

  const fromEnv = process.env["KONSENT_SIGNING_KEY"];
  if (fromEnv) {
    try {
      const pem = Buffer.from(fromEnv, "base64").toString("utf8");
      const privateKey = createPrivateKey(pem);
      // La clé publique se DÉRIVE de la privée : une clé privée ne
      // s'exporte pas au format SPKI, qui est réservé aux clés publiques.
      const publicKeyPem = createPublicKey(privateKey)
        .export({ format: "pem", type: "spki" })
        .toString();
      cached = { privateKey, publicKeyPem, production: true };
      return cached;
    } catch {
      // Clé illisible : on retombe volontairement sur l'éphémère plutôt que
      // de produire une archive signée par une clé douteuse.
    }
  }

  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  cached = {
    privateKey,
    publicKeyPem: publicKey.export({ format: "pem", type: "spki" }).toString(),
    production: false,
  };
  return cached;
}

function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export interface EvidenceBundle {
  filename: string;
  bytes: Buffer;
  /** Empreinte de l'archive elle-même, à consigner dans un registre. */
  archiveSha256: string;
  manifestSha256: string;
  production: boolean;
}

/**
 * Construit l'archive de preuve d'un scan.
 *
 * Contenu : manifeste, constats structurés, observation brute, inventaire
 * des destinataires, rapport lisible en Markdown, sommes de contrôle et
 * signature détachée.
 */
export function buildEvidenceBundle(scan: ScanResult): EvidenceBundle {
  const at = new Date(scan.scannedAt);
  const key = getSigningKey();
  const zip = new ZipBuilder();

  // ── Constats structurés, avec leur règle résolue ──
  const findings = {
    generatedAt: scan.scannedAt,
    rulepackVersion: scan.rulepackVersion,
    count: scan.findings.length,
    findings: scan.findings.map((f) => {
      const rule = getRule(f.ruleId);
      return {
        ruleId: f.ruleId,
        severity: f.severity,
        family: f.family,
        title: f.title,
        occurrences: f.occurrences,
        phase: f.phase,
        references: rule?.references ?? [],
        omnibusStatus: rule?.omnibusStatus ?? null,
        evidence: f.evidence,
      };
    }),
    notEvaluatedRuleIds: scan.notEvaluatedRuleIds,
    notEvaluatedNote:
      "Ces règles n'ont pas pu être vérifiées par le mode d'analyse utilisé. Elles ne doivent en aucun cas être interprétées comme satisfaites.",
  };

  const observation = {
    url: scan.url,
    finalUrl: scan.finalUrl,
    hostname: scan.hostname,
    httpStatus: scan.observation.httpStatus,
    mode: scan.observation.mode,
    durationMs: scan.observation.durationMs,
    pagesAnalyzed: scan.observation.pagesAnalyzed,
    requests: scan.observation.requests.map((r) => ({
      url: r.url,
      hostname: r.hostname,
      origin: r.origin,
      trackerSlug: r.tracker?.slug ?? null,
      phase: r.phase,
    })),
    cookies: scan.observation.cookies,
    cmp: scan.observation.cmp,
    legalPages: scan.observation.legalPages,
    dns: scan.observation.dns.map((d) => ({
      hostname: d.hostname,
      cnameChain: d.cnameChain,
      cloakedTrackerSlug: d.cloakedTracker?.slug ?? null,
    })),
    headers: scan.observation.headers,
    consentMode: scan.observation.consentMode,
    sensitiveTopics: scan.observation.sensitiveTopics,
    formsInsecure: scan.observation.formsInsecure,
  };

  const vendors = scan.vendors.map((v) => ({
    slug: v.slug,
    name: v.name,
    entity: v.entity,
    ultimateParent: v.ultimateParent ?? null,
    hqJurisdiction: v.hqJurisdiction,
    effectiveJurisdiction: v.effectiveJurisdiction,
    adequacy: v.adequacy,
    dpf: v.dpf ?? null,
    categories: v.categories,
  }));

  const report = renderMarkdownReport(scan);

  const files: readonly { name: string; content: string }[] = [
    { name: "findings.json", content: JSON.stringify(findings, null, 2) },
    { name: "observation.json", content: JSON.stringify(observation, null, 2) },
    { name: "vendors.json", content: JSON.stringify(vendors, null, 2) },
    { name: "report.md", content: report },
  ];

  const checksums: Record<string, string> = {};
  for (const f of files) {
    zip.add(f.name, f.content);
    checksums[f.name] = sha256(f.content);
  }

  // ── Manifeste : ce qui rend l'archive interprétable dans dix ans ──
  const manifest = {
    format: "konsent-evidence/1",
    scanId: scan.id,
    target: { url: scan.url, finalUrl: scan.finalUrl, hostname: scan.hostname },
    scannedAtUtc: scan.scannedAt,
    generatedAtUtc: new Date().toISOString(),
    engineMode: scan.observation.mode,
    rulepackVersion: scan.rulepackVersion,
    score: { value: scan.score, grade: scan.grade, label: scan.gradeLabel },
    cappedBy: scan.cappedBy ?? null,
    userAgent: "KonsentBot/1.0",
    issuer: {
      product: EDITOR.product,
      legalName: EDITOR.legalName,
      siren: EDITOR.siren,
    },
    signature: {
      algorithm: SIGNATURE_ALGO,
      publicKeyPem: key.publicKeyPem,
      productionKey: key.production,
      scope:
        "La signature porte sur le fichier SHA256SUMS. Elle atteste que l'archive a été produite par cette instance et n'a pas été altérée depuis.",
      limits: key.production
        ? "Elle ne constitue pas un horodatage qualifié au sens du règlement eIDAS : la date déclarée est celle du serveur émetteur, non celle d'un tiers de confiance."
        : "ATTENTION : aucune clé de signature stable n'est configurée sur cette instance. La clé ci-dessus est éphémère. Cette archive n'a AUCUNE valeur d'opposabilité.",
    },
    checksums,
    disclaimer: DISCLAIMER_LONG,
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestHash = sha256(manifestJson);
  zip.add("manifest.json", manifestJson);

  // ── Sommes de contrôle, puis signature détachée de ce fichier ──
  const sumsLines = [
    ...Object.entries(checksums).map(([name, hash]) => `${hash}  ${name}`),
    `${manifestHash}  manifest.json`,
  ];
  const sums = `${sumsLines.join("\n")}\n`;
  zip.add("SHA256SUMS", sums);

  const signature = sign(null, Buffer.from(sums, "utf8"), key.privateKey);
  zip.add("SHA256SUMS.sig", signature.toString("base64") + "\n");
  zip.add("public-key.pem", key.publicKeyPem);
  zip.add("LISEZ-MOI.txt", readme(scan, key.production));

  const bytes = zip.build(at);

  return {
    filename: `konsent-preuve-${scan.hostname.replace(/[^a-z0-9.-]/gi, "_")}-${scan.id}.zip`,
    bytes,
    archiveSha256: sha256(bytes),
    manifestSha256: manifestHash,
    production: key.production,
  };
}

function readme(scan: ScanResult, productionKey: boolean): string {
  return `ARCHIVE DE PREUVE KONSENT
=========================

Cible          : ${scan.hostname}
Analyse        : ${scan.scannedAt}
Référentiel    : ${scan.rulepackVersion}
Mode du moteur : ${scan.observation.mode}
Score          : ${scan.score}/100 (${scan.grade})

CONTENU
-------
manifest.json      Métadonnées, empreintes et clé publique de vérification.
findings.json      Constats structurés, avec leurs références normatives.
observation.json   Ce qui a été observé, sans interprétation.
vendors.json       Destinataires identifiés et leur juridiction effective.
report.md          Rapport lisible.
SHA256SUMS         Empreintes de chaque fichier.
SHA256SUMS.sig     Signature Ed25519 détachée du fichier ci-dessus.
public-key.pem     Clé publique correspondante.

VÉRIFIER L'INTÉGRITÉ
--------------------
  sha256sum -c SHA256SUMS

VÉRIFIER LA SIGNATURE
---------------------
  openssl pkeyutl -verify -pubin -inkey public-key.pem \\
    -rawin -in SHA256SUMS -sigfile <(base64 -d SHA256SUMS.sig)

PORTÉE
------
${
  productionKey
    ? `La signature atteste que cette archive a été produite par l'instance
émettrice et n'a pas été modifiée depuis. Elle ne constitue PAS un
horodatage qualifié au sens du règlement eIDAS : la date déclarée est celle
du serveur émetteur, et non celle d'un prestataire de services de confiance.`
    : `ATTENTION : cette instance ne dispose d'aucune clé de signature stable.
La clé jointe est éphémère et change à chaque redémarrage. Cette archive
n'a donc AUCUNE valeur d'opposabilité et ne doit pas être produite comme
élément de preuve.`
}

Ce document ne constitue ni un audit juridique, ni une consultation
juridique, ni une certification de conformité.

${EDITOR.legalName} — SIREN ${EDITOR.siren}
`;
}

function renderMarkdownReport(scan: ScanResult): string {
  const lines: string[] = [
    `# Rapport d'audit technique — ${scan.hostname}`,
    "",
    `- Analyse : ${scan.scannedAt}`,
    `- Référentiel : ${scan.rulepackVersion}`,
    `- Mode du moteur : ${scan.observation.mode}`,
    `- Score : ${scan.score}/100 (${scan.grade} — ${scan.gradeLabel})`,
  ];

  if (scan.cappedBy) lines.push(`- Score plafonné : ${scan.cappedBy}`);

  lines.push("", `## Constats (${scan.findings.length})`, "");
  for (const f of scan.findings) {
    const rule = getRule(f.ruleId);
    lines.push(`### ${f.ruleId} — ${f.title}`, "");
    lines.push(`- Gravité : ${f.severity}`);
    lines.push(`- Occurrences : ${f.occurrences}`);
    if (rule) {
      lines.push(`- Références : ${rule.references.join(" · ")}`);
      lines.push("", rule.messageExec, "");
    }
    for (const e of f.evidence.slice(0, 8)) {
      lines.push(`  - ${e.label}${e.detail ? ` — ${e.detail}` : ""}${e.url ? ` (${e.url})` : ""}`);
    }
    lines.push("");
  }

  lines.push(`## Destinataires (${scan.vendors.length})`, "");
  for (const v of scan.vendors) {
    lines.push(
      `- **${v.name}** — ${v.entity} — juridiction effective ${v.effectiveJurisdiction} (${v.adequacy})`,
    );
  }

  lines.push(
    "",
    `## Règles non évaluées (${scan.notEvaluatedRuleIds.length})`,
    "",
    "Ces règles n'ont pas pu être vérifiées par le mode d'analyse utilisé.",
    "Elles ne doivent en aucun cas être interprétées comme satisfaites.",
    "",
    scan.notEvaluatedRuleIds.join(", "),
    "",
    "---",
    "",
    DISCLAIMER_LONG,
  );

  return lines.join("\n");
}
