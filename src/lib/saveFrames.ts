import JSZip from "jszip";
import type { Frame } from "../types";

export async function saveAllFrames(frames: Frame[], zipName = "car-360-photos.zip") {
  const zip = new JSZip();
  const pad = String(frames.length).length;

  frames.forEach((frame, i) => {
    const base64 = frame.src.split(",")[1];
    const index = String(i + 1).padStart(pad, "0");
    zip.file(`photo-${index}.jpg`, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
