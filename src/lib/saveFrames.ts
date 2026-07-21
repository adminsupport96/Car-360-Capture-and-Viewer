import JSZip from "jszip";
import type { Frame } from "../types";

function sanitize(s: string): string {
  return s.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
}

export function baseFileName(unitName: string, modeLabel: string): string {
  return `${sanitize(unitName) || "unit"}_${sanitize(modeLabel)}`;
}

export async function buildFramesZip(
  frames: Frame[],
  baseName: string,
): Promise<Blob> {
  const zip = new JSZip();
  const pad = String(frames.length).length;

  frames.forEach((frame, i) => {
    const base64 = frame.src.split(",")[1];
    const index = String(i + 1).padStart(pad, "0");
    zip.file(`${baseName}-${index}.jpg`, base64, { base64: true });
  });

  return zip.generateAsync({ type: "blob" });
}

export async function saveAllFrames(
  frames: Frame[],
  unitName: string,
  modeLabel: string,
) {
  const baseName = baseFileName(unitName, modeLabel);
  const blob = await buildFramesZip(frames, baseName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
