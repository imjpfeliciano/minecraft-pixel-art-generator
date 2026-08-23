import type { MinecraftBlock } from "./blocks";
import { decodeGrid, encodeGrid } from "./creation-grid";
import type { Orientation } from "./creation";

const SESSION_KEY = "mpag-create-draft";
const IDB_NAME = "mpag-create-draft";
const IDB_STORE = "draft";
const IDB_KEY = "current";

export interface CreateDraftPayload {
  v: 1;
  gridB64: string;
  width: number;
  height: number;
  orientation: Orientation;
  schematicName: string;
  fillBlockId: string;
  foundationEnabled: boolean;
  foundationBlockId: string;
  selectedCategories: string[];
  openSaveModal: boolean;
}

export interface CreateDraftInput {
  blockGrid: MinecraftBlock[][];
  width: number;
  height: number;
  orientation: Orientation;
  schematicName: string;
  fillBlockId: string;
  foundationEnabled: boolean;
  foundationBlockId: string;
  selectedCategories: string[];
}

function uint8ToB64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function b64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(payload: CreateDraftPayload): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(payload, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(): Promise<CreateDraftPayload | null> {
  const db = await openDb();
  const payload = await new Promise<CreateDraftPayload | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve((req.result as CreateDraftPayload | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return payload;
}

async function idbClear(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function saveCreateDraft(input: CreateDraftInput): Promise<void> {
  if (input.blockGrid.length === 0) return;

  const payload: CreateDraftPayload = {
    v: 1,
    gridB64: uint8ToB64(encodeGrid(input.blockGrid)),
    width: input.width,
    height: input.height,
    orientation: input.orientation,
    schematicName: input.schematicName,
    fillBlockId: input.fillBlockId,
    foundationEnabled: input.foundationEnabled,
    foundationBlockId: input.foundationBlockId,
    selectedCategories: input.selectedCategories,
    openSaveModal: true,
  };

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    try {
      await idbClear();
    } catch {
      /* ignore leftover IDB */
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    await idbPut(payload);
  }
}

export async function loadCreateDraft(): Promise<CreateDraftPayload | null> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CreateDraftPayload;
      if (parsed?.v === 1 && parsed.gridB64) return parsed;
    }
  } catch {
    // fall through to IndexedDB
  }
  try {
    return await idbGet();
  } catch {
    return null;
  }
}

export async function clearCreateDraft(): Promise<void> {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  try {
    await idbClear();
  } catch {
    /* ignore */
  }
}

export function decodeCreateDraftGrid(payload: CreateDraftPayload): MinecraftBlock[][] {
  return decodeGrid(b64ToUint8(payload.gridB64));
}
