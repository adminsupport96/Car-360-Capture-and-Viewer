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

// Per Google's documented resumable-upload recovery flow: a PUT with an
// empty body and a "bytes */<size>" Content-Range asks Drive whether it
// already has every byte of the file, without re-sending any data. Returns
// true once Drive confirms the upload is complete.
async function isUploadComplete(uploadUrl: string, size: number): Promise<boolean> {
  try {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Range": `bytes */${size}` },
    });
    return res.status === 200 || res.status === 201;
  } catch {
    return false;
  }
}

export async function saveBlobToDrive(
  blob: Blob,
  filename: string,
): Promise<void> {
  const uploadUrl = await startUploadSession(filename);

  try {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/zip" },
      body: blob,
    });
    if (res.ok) return;
  } catch {
    // The browser can throw here (dropped connection, backgrounded tab, or
    // Drive not exposing this particular response cross-origin) even though
    // Drive already received the full file and finalized it. Don't trust a
    // single failed/thrown response — double-check with Drive directly
    // before telling the user it failed.
  }

  if (await isUploadComplete(uploadUrl, blob.size)) return;

  throw new Error("Drive upload failed — check your connection and try again.");
}
