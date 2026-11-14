"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ContactCard } from "@/components/ContactCard";
import { CommandPalette } from "./CommandPalette";
import { ToolsMenu } from "./ToolsMenu";
import { Logo } from "@/components/Logo";
import { Close, Menu, Moon, Sun } from "./icons";
import { applyTheme } from "./theme";

/**
 * En-tête commun aux services du groupe KAYZEN (gabarit Nexus) : barre
 * blanche translucide qui suit le thème, ombre au défilement, navigation
 * soulignée en terracotta sur la page active, carte de contact, bascule de
 * thème, connexion et appel à l'action en pilule.
 */
const NAV = [
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/surveillance", label: "Surveillance" },
  { href: "/outils", label: "Outils gratuits" },
  { href: "/regles", label: "Référentiel" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState<boolean | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // L'état du thème est lu sur la classe posée par le script de démarrage :
  // c'est la seule source qui soit juste dès le premier rendu client.
  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("konsent-theme", sync);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("konsent-theme", sync);
      mq.removeEventListener("change", sync);
    };
  }, []);

  // Fermeture du menu mobile au changement de page.
  useEffect(() => close(), [pathname, close]);

  // Échap ferme le menu et rend le focus au bouton qui l'a ouvert.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    menuRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur-sm transition-shadow ${
        scrolled ? "shadow-xl" : ""
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4 lg:h-20">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-lg"
            aria-label="Konsent by KAYZEN — accueil"
          >
            <Logo className="h-8 w-8 text-flame" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-extrabold tracking-tight text-ink-2">
                Konsent
              </span>
              <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                by KAYZEN
              </span>
            </span>
          </Link>

          <nav id="navigation" tabIndex={-1} className="hidden items-center gap-0.5 outline-none lg:flex" aria-label="Navigation principale">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              if (item.href === "/outils") {
                return (
                  <ToolsMenu
                    key={item.href}
                    active={
                      active ||
                      ["/comparer", "/auto-evaluation", "/badge", "/simulateur", "/analyse-en-lot"].some(
                        (p) => isActive(pathname, p),
                      )
                    }
                  />
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`font-display flex min-h-11 items-center whitespace-nowrap border-b-2 px-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-flame text-flame"
                      : "border-transparent text-ink-2 hover:text-flame"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <CommandPalette />
            <ContactCard />

            <button
              type="button"
              onClick={() => applyTheme(dark ? "light" : "dark")}
              aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-high hover:text-ink-2"
            >
              {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>

            <div className="ml-1 hidden items-center gap-2 sm:flex">
              <Link
                href="/connexion"
                className="font-display hidden min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm font-semibold text-ink-2 transition-colors hover:text-flame xl:flex"
              >
                Connexion
              </Link>
              <Link
                href="/#scan"
                className="font-display btn-primary flex h-11 items-center justify-center whitespace-nowrap rounded-full bg-flame px-5 text-sm font-bold text-on-primary"
              >
                Auditer mon site
              </Link>
            </div>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-high lg:hidden"
            >
              {open ? <Close className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div
          id="menu-mobile"
          ref={menuRef}
          className="border-t border-line bg-paper px-4 pb-5 pt-3 shadow-lg lg:hidden"
        >
          <nav aria-label="Navigation mobile">
            <ul className="space-y-1">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={close}
                      className={`font-display flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold transition-colors ${
                        active ? "bg-surface-low text-flame" : "text-ink-2 hover:bg-surface-low"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-4 flex gap-3 border-t border-line pt-4">
            <Link
              href="/connexion"
              onClick={close}
              className="font-display flex h-12 flex-1 items-center justify-center rounded-full border border-line-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-low"
            >
              Connexion
            </Link>
            <Link
              href="/#scan"
              onClick={close}
              className="font-display btn-primary flex h-12 flex-1 items-center justify-center rounded-full bg-flame text-sm font-bold text-on-primary"
            >
              Auditer mon site
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
