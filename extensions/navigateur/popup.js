/*
 * Konsent — audit RGPD (extension navigateur). Licence MIT.
 *
 * Ce script ne lit qu'une chose : l'adresse de l'onglet actif, accessible
 * grâce à la permission « activeTab » accordée au moment où l'on ouvre le
 * popup. Il n'envoie rien par lui-même : il ouvre un onglet sur Konsent, à la
 * demande, avec le domaine et le chemin de la page. Les paramètres de requête
 * et le fragment sont retirés, car ils portent parfois des jetons ou des
 * identifiants.
 */
"use strict";

const SITE = "https://konsent.kayzen-lyon.com";
const api = globalThis.browser ?? globalThis.chrome;

const cible = document.getElementById("cible");
const message = document.getElementById("message");
const auditer = document.getElementById("auditer");
const synthese = document.getElementById("synthese");
const outils = document.getElementById("outils");

/** Domaine + chemin, sans schéma, paramètres ni fragment. */
let target = null;

function open(path) {
  api.tabs.create({ url: SITE + path }).then(() => window.close());
}

function refuse(text) {
  cible.textContent = "—";
  message.textContent = text;
  message.hidden = false;
}

async function init() {
  let url;
  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    url = tab && tab.url ? new URL(tab.url) : null;
  } catch {
    url = null;
  }

  if (!url) {
    refuse("Adresse de l'onglet indisponible.");
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    refuse("Seules les pages web (http ou https) peuvent être auditées.");
    return;
  }

  target = url.hostname + (url.pathname === "/" ? "" : url.pathname);
  cible.textContent = target;
  auditer.disabled = false;
  synthese.disabled = false;
}

auditer.addEventListener("click", () => {
  if (target) open("/scan?url=" + encodeURIComponent(target));
});
synthese.addEventListener("click", () => {
  if (target) open("/scan/synthese?url=" + encodeURIComponent(target));
});
outils.addEventListener("click", () => open("/outils"));

init();
