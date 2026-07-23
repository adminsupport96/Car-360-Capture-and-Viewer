import { useEffect, useState } from "react";
import {
  deleteSavedZip,
  getSavedZipBlob,
  listSavedZips,
  type SavedZip,
} from "../lib/localLibrary";
import { saveBlobToDrive } from "../lib/googleDrive";

interface LibraryScreenProps {
  onBack: () => void;
}

type UploadState = "idle" | "uploading" | "uploaded" | "error";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LibraryScreen({ onBack }: LibraryScreenProps) {
  const [items, setItems] = useState<SavedZip[] | null>(null);
  const [uploadState, setUploadState] = useState<
    Record<string, UploadState>
  >({});

  useEffect(() => {
    listSavedZips().then(setItems);
  }, []);

  async function handleUpload(item: SavedZip) {
    if (uploadState[item.id] === "uploading") return;
    setUploadState((s) => ({ ...s, [item.id]: "uploading" }));
    try {
      const blob = await getSavedZipBlob(item.id);
      if (!blob) throw new Error("File no longer available");
      await saveBlobToDrive(blob, item.filename);
      setUploadState((s) => ({ ...s, [item.id]: "uploaded" }));
    } catch (err) {
      console.error("Upload to Drive failed:", err);
      setUploadState((s) => ({ ...s, [item.id]: "error" }));
    }
  }

  async function handleDelete(item: SavedZip) {
    if (!confirm(`Delete ${item.filename}?`)) return;
    await deleteSavedZip(item.id);
    setUploadState(({ [item.id]: _removed, ...rest }) => rest);
    setItems((prev) => prev?.filter((i) => i.id !== item.id) ?? prev);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-bg px-5 pt-[calc(var(--safe-top)+24px)] pb-[calc(var(--safe-bottom)+24px)] [-webkit-overflow-scrolling:touch]">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="m-0 font-display text-2xl font-bold">Saved spins</h1>
        <button
          type="button"
          onClick={onBack}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-full border-none bg-bg-elevated text-base text-text"
        >
          ✕
        </button>
      </div>

      {items == null && (
        <div className="py-10 text-center font-mono text-sm text-text-dim">
          Loading…
        </div>
      )}

      {items != null && items.length === 0 && (
        <div className="py-10 text-center font-mono text-sm text-text-dim">
          Nothing saved locally yet — use "save locally" after a capture.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items?.map((item) => {
          const state = uploadState[item.id] ?? "idle";
          return (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-2xl border border-bg-elevated-2 bg-bg-elevated px-4 py-3.5"
            >
              <div className="truncate font-mono text-sm text-text">
                {item.filename}
              </div>
              <div className="flex items-center justify-between text-xs text-text-dim">
                <span>
                  {formatDate(item.createdAt)} · {formatSize(item.size)}
                </span>
                <span>{item.frameCount} frames</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleUpload(item)}
                  disabled={state === "uploading"}
                  className="flex-1 rounded-full border-none bg-accent py-2 font-mono text-xs font-bold text-accent-ink disabled:opacity-50"
                >
                  {state === "uploading"
                    ? "uploading…"
                    : state === "uploaded"
                      ? "uploaded ✓"
                      : state === "error"
                        ? "upload failed — retry"
                        : "upload to drive"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="rounded-full border border-bg-elevated-2 bg-transparent px-3 py-2 font-mono text-xs text-text-dim"
                >
                  delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
