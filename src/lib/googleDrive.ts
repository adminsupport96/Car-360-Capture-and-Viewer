// Google Drive rejects (and Vercel's serverless functions cap request bodies
// at ~4.5MB) if we try to proxy the whole zip through our own API route, so
// interior captures (small, few frames) used to squeak through while
// exterior/orbit captures (10MB+) failed silently.
//
// Instead we ask our API for a short-lived Drive "resumable upload" session
// URL (tiny JSON request/response) and then PUT the actual file bytes
// straight from the browser to Google, bypassing our server entirely.
async function startUploadSession(filename: string): Promise<string> {
  const res = await fetch("/api/start-drive-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Couldn't start Drive upload (${res.status}).`);
  }

  const data = (await res.json()) as { uploadUrl: string };
  return data.uploadUrl;
}

export async function saveBlobToDrive(
  blob: Blob,
  filename: string,
): Promise<void> {
  const uploadUrl = await startUploadSession(filename);

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(blob.size),
    },
    body: blob,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || `Drive upload failed (${res.status}).`);
  }
}
