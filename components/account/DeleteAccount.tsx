"use client";

import { useId, useRef, useState, type FormEvent } from "react";

/**
 * Suppression du compte — droit à l'effacement (art. 17 RGPD).
 *
 * Le bouton ouvre un `<dialog>` modal natif : piège de focus, touche Échap et
 * fond inerte sont fournis par le navigateur. Le titulaire doit retaper son
 * adresse e-mail ; la route la contrôle de nouveau côté serveur. L'envoi est
 * un formulaire natif (POST), pour que le navigateur pose l'en-tête `Origin`
 * vérifié par la route, et que la redirection finale soit une vraie
 * navigation.
 */
export function DeleteAccount({
  email,
  subAccountCount,
}: {
  email: string;
  subAccountCount: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const uid = useId();
  const titleId = `${uid}-titre`;
  const descId = `${uid}-desc`;
  const inputId = `${uid}-email`;
  const errorId = `${uid}-erreur`;

  function open() {
    setTyped("");
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (typed.trim().toLowerCase() !== email.trim().toLowerCase()) {
      event.preventDefault();
      setError("L'adresse saisie ne correspond pas à celle du compte. Rien n'a été supprimé.");
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        className="font-display min-h-11 rounded-full border-2 border-crit-text px-5 text-sm font-bold text-crit-text transition-colors hover:bg-surface-high"
      >
        Supprimer mon compte…
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClose={() => triggerRef.current?.focus()}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-3xl border border-line bg-surface p-6 text-ink-2 backdrop:bg-black/60"
      >
        <h2 id={titleId} className="display text-xl text-ink-2">
          Supprimer définitivement le compte
        </h2>
        <div id={descId} className="mt-3 space-y-2 text-[14px] leading-relaxed text-muted">
          <p>
            Cette action est <strong className="text-ink-2">immédiate et irréversible</strong>. Seront
            effacés : le compte, ses sessions, ses domaines surveillés avec leur historique et leurs
            alertes, et ses clés d&apos;API. Le journal des appels d&apos;API est conservé sans
            lien avec vous.
          </p>
          {subAccountCount > 0 ? (
            <p>
              Les {subAccountCount} sous-compte{subAccountCount > 1 ? "s" : ""} rattaché
              {subAccountCount > 1 ? "s" : ""} à cette agence ne sont pas supprimés : ils redeviennent
              des comptes indépendants.
            </p>
          ) : null}
          <p>Pensez à télécharger vos données avant de confirmer.</p>
        </div>

        <form method="post" action="/api/compte/supprimer" onSubmit={onSubmit} noValidate className="mt-5">
          <label htmlFor={inputId} className="block text-[14px] font-semibold text-ink-2">
            Pour confirmer, saisissez l&apos;adresse du compte : <span className="font-normal">{email}</span>
          </label>
          <input
            id={inputId}
            name="email"
            type="email"
            autoComplete="off"
            required
            autoFocus
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="mt-2 block min-h-11 w-full rounded-lg border-2 border-line-2 bg-surface px-3 text-[15px] text-ink-2"
          />
          {error ? (
            <p id={errorId} role="alert" className="mt-2 text-sm text-crit-text">
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="font-display min-h-11 rounded-full border-2 border-line-2 px-5 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface-high"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="font-display min-h-11 rounded-full bg-crit-text px-5 text-sm font-bold text-paper"
            >
              Supprimer définitivement
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
