/**
 * Firebase Admin connectivity check.
 *
 *   pnpm verify-firebase
 *
 * Performs a real round trip against Firestore and Storage — write, read,
 * delete — so a pass means the service account genuinely has the access the
 * app needs, not just that the credentials parsed.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const REQUIRED = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_STORAGE_BUCKET",
];

const pass = (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const fail = (msg) => console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
const info = (msg) => console.log(`\x1b[2m${msg}\x1b[0m`);

function die(message, hint) {
  fail(message);
  if (hint) info(`\n    ${hint}`);
  process.exit(1);
}

console.log("\nFirebase Admin check\n");

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  die(
    `Missing environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
    'Generate a service account key: Firebase Console → Project settings →\n    Service accounts → "Generate new private key", then copy project_id,\n    client_email and private_key into .env.local.',
  );
}
pass(`Environment variables present (project ${process.env.FIREBASE_PROJECT_ID})`);

const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
if (!privateKey.includes("BEGIN PRIVATE KEY")) {
  die(
    "FIREBASE_PRIVATE_KEY is not a PEM key",
    "Copy the entire private_key value from the service account JSON,\n    including the -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- lines.",
  );
}

let app;
try {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  pass("Credentials parsed");
} catch (error) {
  die(`Could not initialize the Admin SDK: ${error.message}`);
}

const stamp = `verify-${Date.now()}`;

// ── Firestore ────────────────────────────────────────────────────────────────
try {
  const db = getFirestore(app);
  const ref = db.collection("_healthcheck").doc(stamp);

  await ref.set({ ok: true, at: new Date().toISOString() });
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("document was written but could not be read back");
  await ref.delete();

  pass("Firestore write / read / delete");
} catch (error) {
  die(
    `Firestore failed: ${error.message}`,
    "If this says NOT_FOUND, the Firestore database has not been created yet:\n    Firebase Console → Build → Firestore Database → Create database.",
  );
}

// ── Storage ──────────────────────────────────────────────────────────────────
try {
  const bucket = getStorage(app).bucket();
  const [exists] = await bucket.exists();
  if (!exists) {
    throw new Error(`bucket "${bucket.name}" does not exist`);
  }

  const file = bucket.file(`_healthcheck/${stamp}.txt`);
  await file.save("ok", { contentType: "text/plain" });
  await file.delete();

  pass(`Storage upload / delete (${bucket.name})`);
} catch (error) {
  die(
    `Storage failed: ${error.message}`,
    "Check FIREBASE_STORAGE_BUCKET matches the bucket shown in\n    Firebase Console → Build → Storage. It usually ends in .firebasestorage.app.",
  );
}

console.log("\n\x1b[32mFirebase is configured correctly.\x1b[0m\n");
process.exit(0);
