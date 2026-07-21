export async function saveBlobToDrive(
  blob: Blob,
  filename: string,
): Promise<void> {
  const res = await fetch("/api/upload-to-drive", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": encodeURIComponent(filename),
    },
    body: blob,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Drive upload failed (${res.status}).`);
  }
}
