import type { Mode } from "../types";

export interface SavedZip {
  id: string;
  filename: string;
  unitName: string;
  mode: Mode;
  frameCount: number;
  size: number;
  createdAt: number;
}

interface SavedZipRecord extends SavedZip {
  blob: Blob;
}

const DB_NAME = "car360-library";
const DB_VERSION = 1;
const STORE_NAME = "zips";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveZipLocally(
  blob: Blob,
  filename: string,
  meta: { unitName: string; mode: Mode; frameCount: number },
): Promise<void> {
  const db = await openDb();
  const record: SavedZipRecord = {
    id: crypto.randomUUID(),
    filename,
    blob,
    size: blob.size,
    createdAt: Date.now(),
    ...meta,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listSavedZips(): Promise<SavedZip[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const records = req.result as SavedZipRecord[];
      resolve(
        records
          .map(({ blob: _blob, ...meta }) => meta)
          .sort((a, b) => b.createdAt - a.createdAt),
      );
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getSavedZipBlob(
  id: string,
): Promise<Blob | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () =>
      resolve((req.result as SavedZipRecord | undefined)?.blob);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSavedZip(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
