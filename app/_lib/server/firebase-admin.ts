import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const APP_NAME = "mc-pixel";

// Dev HMR re-evaluates this module while the process lives on. Firestore
// `settings()` throws if called twice, so the handles are cached on globalThis
// rather than in module scope.
const globalCache = globalThis as typeof globalThis & {
  __mcPixelFirebase?: { app?: App; firestore?: Firestore };
};

const cache = (globalCache.__mcPixelFirebase ??= {});

class FirebaseConfigError extends Error {
  constructor(message: string) {
    super(`${message}\n\nSee "Firebase setup" in README.md.`);
    this.name = "FirebaseConfigError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new FirebaseConfigError(`Missing environment variable ${name}.`);
  return value;
}

// Service account PEMs survive .env files and Vercel's dashboard as a single
// line with literal backslash-n sequences, which `cert()` rejects.
function readPrivateKey(): string {
  const key = requireEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");
  if (!key.includes("BEGIN PRIVATE KEY")) {
    throw new FirebaseConfigError(
      "FIREBASE_PRIVATE_KEY does not look like a PEM key. Copy the full `private_key` value from the service account JSON, including the BEGIN and END lines.",
    );
  }
  return key;
}

function getAdminApp(): App {
  if (cache.app) return cache.app;

  cache.app =
    getApps().find((app) => app.name === APP_NAME) ??
    initializeApp(
      {
        credential: cert({
          projectId: requireEnv("FIREBASE_PROJECT_ID"),
          clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
          privateKey: readPrivateKey(),
        }),
        storageBucket: requireEnv("FIREBASE_STORAGE_BUCKET"),
      },
      APP_NAME,
    );

  return cache.app;
}

/**
 * Firestore handle. Initialization is deferred to the first call so that
 * importing this module during `next build` does not require credentials.
 */
export function getDb(): Firestore {
  if (cache.firestore) return cache.firestore;

  const firestore = getFirestore(getAdminApp());
  // Writing a document with `undefined` fields throws by default. Optional
  // creation metadata is far more ergonomic when those keys are simply skipped.
  firestore.settings({ ignoreUndefinedProperties: true });
  cache.firestore = firestore;
  return firestore;
}

/** Default Storage bucket, as configured by `FIREBASE_STORAGE_BUCKET`. */
export function getBucket() {
  return getStorage(getAdminApp()).bucket();
}
