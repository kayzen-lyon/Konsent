import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Accès à la base Postgres (Neon, région Francfort).
 *
 * Le pilote HTTP de Neon : une requête = un appel HTTPS, sans pool à gérer,
 * adapté aux fonctions Vercel. La base n'est jointe QUE par le serveur, avec
 * la chaîne `DATABASE_URL` posée par l'intégration Vercel — il n'existe pas
 * de clé publique comme chez Supabase.
 *
 * Initialisation paresseuse : `next build` évalue les modules sans les
 * variables d'environnement, et `neon()` lève si l'URL manque.
 */
export type Sql = NeonQueryFunction<false, false>;

let client: Sql | null = null;

export function databaseUrl(): string | undefined {
  return process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"];
}

export function dbConfigured(): boolean {
  return Boolean(databaseUrl());
}

export function getSql(): Sql {
  if (!client) {
    const url = databaseUrl();
    if (!url) throw new Error("DATABASE_URL absente : aucune base configurée.");
    client = neon(url);
  }
  return client;
}

/** Les colonnes `timestamptz` reviennent en `Date` : on les rend en ISO. */
export function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export function isoOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : iso(value);
}

export const NO_DATABASE_ENV = ["DATABASE_URL"] as const;
