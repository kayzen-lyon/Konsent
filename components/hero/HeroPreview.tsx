import type { ReactNode } from "react";

/**
 * Gabarit du héros : titre centré, action, puis cadre de démonstration.
 *
 * Adapté de « Modern AI SaaS Hero with Interactive Live Preview » (themeocean,
 * licence MIT), depuis
 * https://21st.dev/@themeocean/components/modern-ai-saa-s-hero-with-interactive-live-preview.
 * Adaptations : jetons Konsent, formulaire d'audit à la place des deux boutons,
 * apparition en CSS pour que le titre soit visible sans JavaScript, ni flou
 * ni halo.
 */
export function HeroPreview({
  title,
  subtitle,
  action,
  preview,
  footer,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  action: ReactNode;
  preview: ReactNode;
  footer: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-paper px-4 pb-14 pt-12 sm:px-6 md:pb-20 md:pt-16 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--color-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-70 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_40%,transparent_100%)]"
      />
      <div className="mx-auto flex max-w-5xl flex-col items-center">
        <div className="rise flex w-full flex-col items-center text-center">
          <h1 className="hero-title max-w-4xl text-balance text-ink-2">{title}</h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted md:text-xl">
            {subtitle}
          </p>
          <div id="scan" className="mt-8 w-full max-w-xl scroll-mt-28">
            {action}
          </div>
        </div>
        <div
          className="rise mt-10 w-full rounded-3xl border border-line bg-surface-low p-2 shadow-lg sm:p-3"
          style={{ animationDelay: "120ms" }}
        >
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">{preview}</div>
        </div>
        {footer}
      </div>
    </section>
  );
}
