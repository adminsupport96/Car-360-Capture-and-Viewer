export const CAPTURE_MAX_DIM = 1600;
export const CAPTURE_QUALITY = 0.88;

export function drawToDataUrl(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): string | null {
  if (!sourceWidth || !sourceHeight) return null;
  const scale = Math.min(1, CAPTURE_MAX_DIM / Math.max(sourceWidth, sourceHeight));
  canvas.width = sourceWidth * scale;
  canvas.height = sourceHeight * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", CAPTURE_QUALITY);
}
