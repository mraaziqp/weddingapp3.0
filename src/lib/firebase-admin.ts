import 'server-only';
import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin — server only.
 * ─────────────────────────────
 * The Admin SDK bypasses Firestore security rules, which is what lets
 * firestore.rules stay locked down over the collections holding real personal
 * data (households, guests, vendors, budget). Guests' browsers can't read
 * those at all; the app's API routes reach them through this client instead.
 *
 * That's a genuine improvement on the Supabase setup this replaced, where the
 * anon key in the page source could read all 261 guest records.
 *
 * Credentials come from FIREBASE_SERVICE_ACCOUNT_B64 — the service account
 * JSON, base64-encoded so the private key's newlines survive .env parsing and
 * a single-line Vercel environment variable.
 */

const ADMIN_APP_NAME = 'wedu-admin';

export class AdminNotConfiguredError extends Error {
  constructor() {
    super(
      'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_B64 ' +
        '(base64 of the service account JSON).'
    );
    this.name = 'AdminNotConfiguredError';
  }
}

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function readServiceAccount(): ServiceAccount | null {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (encoded) {
    try {
      return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not valid base64-encoded JSON.');
    }
  }
  // Also accept the raw JSON, for platforms where a multi-line secret is fine.
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    }
  }
  return null;
}

/** True when admin credentials are available (or the emulator is running). */
export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_SERVICE_ACCOUNT_B64 ||
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  );
}

function adminApp(): App {
  const existing = getApps().find(a => a.name === ADMIN_APP_NAME);
  if (existing) return getApp(ADMIN_APP_NAME);

  const serviceAccount = readServiceAccount();

  // Against the emulator no real credentials are needed — the SDK talks to
  // FIRESTORE_EMULATOR_HOST and accepts any project id. This is what lets the
  // whole data layer be tested without touching the couple's live project.
  if (!serviceAccount) {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      return initializeApp(
        { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-12716644-3255b' },
        ADMIN_APP_NAME
      );
    }
    throw new AdminNotConfiguredError();
  }

  return initializeApp(
    {
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      projectId: serviceAccount.project_id,
    },
    ADMIN_APP_NAME
  );
}

/**
 * Cached on globalThis, not in a module-scoped variable.
 *
 * The Firestore instance lives on the Firebase app, which outlives this
 * module: Next.js re-evaluates modules on hot reload and across serverless
 * entry points. A plain `let` reset to null each time while the underlying
 * instance survived, so the second call re-ran `settings()` — which Firestore
 * permits exactly once — and threw "Firestore has already been initialized"
 * on every request after the first reload.
 */
const globalRef = globalThis as typeof globalThis & { __WEDU_ADMIN_DB__?: Firestore };

/** The privileged Firestore handle. Never import this from a client component. */
export function adminDb(): Firestore {
  if (!globalRef.__WEDU_ADMIN_DB__) {
    const instance = getFirestore(adminApp());
    // Treat a missing field as undefined rather than throwing, so a document
    // migrated without every optional column doesn't break a write. Guarded
    // because settings() throws if the instance has already been configured
    // or used.
    try {
      instance.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Already configured by a previous module evaluation — fine.
    }
    globalRef.__WEDU_ADMIN_DB__ = instance;
  }
  return globalRef.__WEDU_ADMIN_DB__;
}
