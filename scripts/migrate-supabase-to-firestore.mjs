#!/usr/bin/env node
/**
 * One-time copy of the Supabase data into Firestore.
 * ──────────────────────────────────────────────────
 *   node scripts/migrate-supabase-to-firestore.mjs --dry-run   # inspect first
 *   node scripts/migrate-supabase-to-firestore.mjs             # write
 *
 * Reads from Supabase over its REST API using the anon key already in
 * .env.local, and writes through the Firebase Admin SDK.
 *
 * Safe to re-run. Documents keep the app's own string ids (`household-…`,
 * `guest-…`), so a second pass overwrites rather than duplicating, and every
 * cross-reference between a guest and their household survives untouched.
 *
 * Nothing is deleted from Supabase. It stays as a fallback until the couple is
 * confident, and can be turned off afterwards.
 */

import { readFileSync, existsSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DRY_RUN = process.argv.includes('--dry-run');

// Collections copied verbatim. `media` is deliberately absent: guest photos
// live in Google Drive now, and the Supabase table was empty anyway.
const TABLES = [
  'households',
  'guests',
  'tables',
  'menu_items',
  'timeline_events',
  'tracks',
  'gifts',
  'contributions',
  'std_opens',
  'vendors',
  'budget_items',
  'budget_settings',
  'well_wishes',
];

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n  Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  console.error('  Add the old Supabase values to .env.local to run the migration.\n');
  process.exit(1);
}

const db = DRY_RUN ? null : connectFirestore();

console.log(`\n  ${DRY_RUN ? 'DRY RUN — nothing will be written' : 'Migrating to Firestore'}`);
console.log(`  Source: ${SUPABASE_URL}\n`);

let grandTotal = 0;
const summary = [];

for (const table of TABLES) {
  const rows = await fetchAll(table);
  grandTotal += rows.length;
  summary.push({ table, rows: rows.length });

  if (!rows.length) {
    console.log(`  ${table.padEnd(18)} 0 rows — skipped`);
    continue;
  }

  if (DRY_RUN) {
    console.log(`  ${table.padEnd(18)} ${String(rows.length).padStart(4)} rows`);
    console.log(`  ${' '.repeat(18)} sample id: ${docIdFor(table, rows[0])}`);
    continue;
  }

  // Firestore caps a batch at 500 writes.
  let written = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    const batch = db.batch();
    for (const row of chunk) {
      const { id: _ignored, ...rest } = row;
      batch.set(db.collection(table).doc(docIdFor(table, row)), stripUndefined(rest));
    }
    await batch.commit();
    written += chunk.length;
  }
  console.log(`  ${table.padEnd(18)} ${String(written).padStart(4)} rows written`);
}

console.log(`\n  ${grandTotal} rows total.`);

if (!DRY_RUN) {
  console.log('\n  Verifying counts in Firestore…');
  let mismatches = 0;
  for (const { table, rows } of summary) {
    const snap = await db.collection(table).count().get();
    const actual = snap.data().count;
    const ok = actual >= rows;
    if (!ok) mismatches++;
    console.log(`  ${ok ? 'OK  ' : 'DIFF'} ${table.padEnd(18)} supabase=${rows} firestore=${actual}`);
  }
  console.log(
    mismatches ? `\n  ${mismatches} collection(s) short — investigate before switching over.\n`
               : '\n  Every collection matched or exceeded the source count.\n'
  );
  process.exit(mismatches ? 1 : 0);
}

console.log('  Re-run without --dry-run to write.\n');

// ── helpers ───────────────────────────────────────────────────────────────

function connectFirestore() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!encoded) {
    console.error('\n  FIREBASE_SERVICE_ACCOUNT_B64 is not set — cannot write to Firestore.\n');
    process.exit(1);
  }
  const sa = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  const app = initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
    projectId: sa.project_id,
  });
  const instance = getFirestore(app);
  instance.settings({ ignoreUndefinedProperties: true });
  return instance;
}

/**
 * The document id to store a row under.
 *
 * Every table but budget_settings already carries the app's own stable string
 * id; budget_settings is a single well-known row the app reads as 'main'.
 */
function docIdFor(table, row) {
  if (table === 'budget_settings') return 'main';
  return String(row.id);
}

/** Firestore rejects undefined; Postgres nulls come through as null already. */
function stripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** Pages through a Supabase table 1000 rows at a time. */
async function fetchAll(table) {
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  const all = [];
  const PAGE = 1000;

  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=${PAGE}&offset=${offset}`,
      { headers }
    );
    if (!res.ok) {
      // A table that never existed in this project isn't an error worth
      // stopping the whole migration for.
      if (res.status === 404) return [];
      throw new Error(`Supabase ${table} -> ${res.status} ${await res.text()}`);
    }
    const page = await res.json();
    all.push(...page);
    if (page.length < PAGE) break;
  }
  return all;
}

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, '');
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  }
}
