"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EDITOR } from "@/lib/disclaimer";
import { Logo } from "@/components/Logo";
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  Facebook,
  Link2,
  Linkedin,
  MapPin,
  Mail,
  MessageCircle,
  Monitor,
  Moon,
  Sun,
  XLogo,
} from "./icons";
import { applyTheme, readTheme, type ThemeChoice } from "./theme";

/**
 * Pied de page commun aux services du groupe KAYZEN — même structure que
 * Nexus et DocuSûr : marque et indicateurs, partage, quatre colonnes de
 * liens, bandeau légal avec sélecteur de thème et retour en haut.
 *
 * Les boutons de partage sont de simples liens : aucun script ni widget de
 * réseau social n'est chargé, donc aucune requête tierce tant que le
 * visiteur ne clique pas.
 */
type FooterLink = { label: string; href: string; external?: boolean };

const COLUMNS: Record<string, FooterLink[]> = {
  Outils: [
    { label: "Audit RGPD gratuit", href: "/#scan" },
    { label: "Décodeur TCF", href: "/outils/decodeur-tcf" },
    { label: "Simulateur d'exposition", href: "/simulateur" },
    { label: "Base des traceurs", href: "/traceurs" },
    { label: "Tous les outils", href: "/outils" },
  ],
  Konsent: [
    { label: "Fonctionnalités", href: "/fonctionnalites" },
    { label: "Surveillance", href: "/surveillance" },
    { label: "Tarifs", href: "/tarifs" },
    { label: "Référentiel des règles", href: "/regles" },
    { label: "Méthodologie", href: "/methodologie" },
    { label: "Nous écrire", href: "/contact" },
  ],
  "Groupe KAYZEN": [
    { label: "Agence web KAYZEN", href: EDITOR.groupSite, external: true },
    { label: "Nexus — audit SEO et IA", href: "https://nexus.kayzen-lyon.com", external: true },
    { label: "DocuSûr — outils PDF", href: "https://docusur.kayzen-lyon.com", external: true },
  ],
  Légal: [
    { label: "Mentions légales", href: "/mentions-legales" },
    { label: "CGU", href: "/cgu" },
    { label: "CGV", href: "/cgv" },
    { label: "Politique de confidentialité", href: "/confidentialite" },
    { label: "Cookies : aucun traceur", href: "/confidentialite#cookies" },
    { label: "Index des cookies", href: "/cookies" },
    { label: "Accessibilité : partiellement conforme", href: "/accessibilite" },
    { label: "Plan du site", href: "/plan-du-site" },
  ],
};

const STATS = [
  { label: "Traceurs", value: "Zéro" },
  { label: "Inscription", value: "Facultative" },
  { label: "Conçu à", value: "Lyon" },
];

const ROUND =
  "flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/80 transition-colors hover:bg-white/15 hover:text-white";

function ShareLinks() {
  const [url, setUrl] = useState<string>(EDITOR.productSite);
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(window.location.href), []);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent("Konsent — l'audit RGPD et cookies indépendant, par KAYZEN");
  const items = [
    { label: "Partager sur Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, Icon: Facebook },
    { label: "Partager sur X", href: `https://x.com/intent/post?url=${u}&text=${t}`, Icon: XLogo },
    { label: "Partager sur LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, Icon: Linkedin },
    { label: "Partager sur WhatsApp", href: `https://wa.me/?text=${t}%20${u}`, Icon: MessageCircle },
    { label: "Partager par e-mail", href: `mailto:?subject=${t}&body=${u}`, Icon: Mail },
  ];

  return (
    <ul className="flex flex-wrap gap-2.5">
      {items.map(({ label, href, Icon }) => (
        <li key={label}>
          <a
            href={href}
            target={href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noopener noreferrer"
            className={ROUND}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">
              {label}
              {href.startsWith("mailto:") ? "" : " (nouvel onglet)"}
            </span>
          </a>
        </li>
      ))}
      <li>
        <button
          type="button"
          className={ROUND}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* presse-papiers indisponible : rien à faire */
            }
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          <span className="sr-only">Copier le lien de la page</span>
        </button>
      </li>
      <li role="status" className="sr-only">
        {copied ? "Lien copié" : ""}
      </li>
    </ul>
  );
}

function ThemeSwitcher() {
  const [choice, setChoice] = useState<ThemeChoice | null>(null);
  useEffect(() => {
    setChoice(readTheme());
    const onChange = (e: Event) => setChoice((e as CustomEvent<ThemeChoice>).detail);
    window.addEventListener("konsent-theme", onChange);
    return () => window.removeEventListener("konsent-theme", onChange);
  }, []);

  const options: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Clair", Icon: Sun },
    { value: "dark", label: "Sombre", Icon: Moon },
    { value: "system", label: "Système", Icon: Monitor },
  ];

  return (
    <fieldset className="inline-flex rounded-full border border-white/15 bg-white/[0.06] p-1">
      <legend className="sr-only">Thème d&apos;affichage</legend>
      {options.map(({ value, label, Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => applyTheme(value)}
            className={`font-display flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors ${
              active ? "bg-white text-navy-deep" : "text-white/80 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </fieldset>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-navy-deep text-white/75">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 py-14 lg:grid-cols-[1.2fr_2.8fr]">
          <div className="max-w-sm">
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2"
              aria-label="Konsent — accueil"
            >
              <Logo className="h-7 w-7 text-flame" />
              <span className="font-display text-base font-extrabold tracking-tight text-[#1f2937]">
                Konsent
              </span>
            </Link>
            <p className="mb-6 text-sm leading-relaxed">
              Audit RGPD, cookies et traceurs, indépendant de toute plateforme de consentement :
              ce qui se dépose avant le choix du visiteur, qui le reçoit, sous quelle juridiction.
              Un service conçu à Lyon par KAYZEN.
            </p>
            <dl className="mb-7 flex divide-x divide-white/15">
              {STATS.map((s) => (
                <div key={s.label} className="px-4 first:pl-0">
                  <dt className="font-display text-[11px] font-bold uppercase tracking-wider text-gold">
                    {s.label}
                  </dt>
                  <dd className="text-sm font-semibold text-white">{s.value}</dd>
                </div>
              ))}
            </dl>
            <p className="font-display mb-3 text-xs font-bold uppercase tracking-wider text-white/70">
              Partager cette page
            </p>
            <ShareLinks />
            <a
              href={EDITOR.groupSite}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display mt-7 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Un service KAYZEN
              <ArrowUpRight className="h-4 w-4 text-gold" />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </div>

          <nav aria-label="Liens du pied de page" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {Object.entries(COLUMNS).map(([title, links]) => {
              const id = `pied-${title.toLowerCase().replace(/\s+/g, "-")}`;
              return (
                <div key={title}>
                  <h2
                    id={id}
                    className="font-display mb-4 text-xs font-bold uppercase tracking-wider text-gold"
                  >
                    {title}
                  </h2>
                  <ul className="space-y-2.5" aria-labelledby={id}>
                    {links.map((link) => (
                      <li key={link.label}>
                        {link.external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-white/80 transition-colors hover:text-white hover:underline"
                          >
                            {link.label}
                            <span className="sr-only"> (nouvel onglet)</span>
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="text-sm text-white/80 transition-colors hover:text-white hover:underline"
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-5 border-t border-white/10 py-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 text-xs leading-relaxed">
            <p>
              <strong className="text-white">Éditeur :</strong> {EDITOR.tradeName} EI (
              {EDITOR.director}), {EDITOR.address}, {EDITOR.country}.
              <span aria-hidden="true"> | </span> SIRET : {EDITOR.siret}
            </p>
            <p>
              <strong className="text-white">Hébergement :</strong> Vercel Inc., 440 N Barranca Ave
              #4133, Covina, CA 91723, États-Unis.
            </p>
            <p>
              Fièrement réalisé par{" "}
              <a
                href={EDITOR.agencySite}
                target="_blank"
                rel="noopener"
                className="font-semibold text-white underline decoration-gold underline-offset-2 hover:text-gold"
              >
                {EDITOR.agencyName}
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            </p>
          </div>
          <ThemeSwitcher />
          <p className="font-display flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white">
            <MapPin className="h-3.5 w-3.5 text-gold" />© {year} Konsent. Conçu à Lyon.
          </p>
          <button
            type="button"
            onClick={() => {
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
              document.getElementById("contenu")?.focus({ preventScroll: true });
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-full border-2 border-white/30 text-white transition-colors hover:bg-white/10 lg:self-auto"
          >
            <ArrowUp className="h-4 w-4" />
            <span className="sr-only">Revenir en haut de la page</span>
          </button>
        </div>

        <p className="border-t border-white/10 py-5 text-[11px] leading-relaxed text-white/65">
          Les montants affichés sont des plafonds légaux théoriques, jamais une prévision de
          sanction. Analyse technique automatisée, sans valeur de consultation juridique.
        </p>
      </div>
    </footer>
  );
}
