/**
 * Notifications éphémères (« toasts »).
 *
 * `toast()` ne rend rien : il émet un événement que `<Toaster />`, monté une
 * fois dans le layout, écoute et affiche. Aucun état partagé, aucun contexte
 * React : n'importe quel composant client peut l'appeler, et un appel côté
 * serveur (pas de `window`) est simplement ignoré.
 */

export type ToastTone = "info" | "success" | "error";

export type ToastDetail = { message: string; tone: ToastTone };

export const TOAST_EVENT = "konsent:toast";

export function toast(message: string, tone: ToastTone = "info"): void {
  if (typeof window === "undefined" || !message.trim()) return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, tone } }));
}
