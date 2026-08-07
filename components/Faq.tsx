interface QA {
  q: string;
  a: string;
}

/**
 * Accordéon FAQ, bâti sur <details>/<summary> : accessible au clavier et
 * fonctionnel sans JavaScript, ce qui évite d'expédier du code client pour
 * un comportement que le navigateur sait faire.
 */
export function Faq({ items }: { items: readonly QA[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-2.5">
      {items.map((item) => (
        <details
          key={item.q}
          className="group rounded-lg border border-line bg-white transition hover:border-line-2"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
            <span className="text-[15px] font-semibold leading-snug text-ink-2">{item.q}</span>
            <span
              className="shrink-0 text-flame transition group-open:rotate-45"
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </summary>
          <div className="border-t border-line px-5 py-4">
            <p className="text-[14px] leading-relaxed text-muted">{item.a}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
