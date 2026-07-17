import JSZip from "jszip";
import type { Frame } from "../types";

function sanitize(s: string): string {
  return s.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
}

export async function saveAllFrames(
  frames: Frame[],
  unitName: string,
  modeLabel: string,
) {
  const baseName = `${sanitize(unitName) || "unit"}_${sanitize(modeLabel)}`;
  const zip = new JSZip();
  const pad = String(frames.length).length;

  frames.forEach((frame, i) => {
    const base64 = frame.src.split(",")[1];
    const index = String(i + 1).padStart(pad, "0");
    zip.file(`${baseName}-${index}.jpg`, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
