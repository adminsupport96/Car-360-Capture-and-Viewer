// The zip is posted to our own /api/upload-to-drive (an Edge Function — see
// that file for why), which relays it on to Google Drive server-to-server.
// Keeping this a same-origin request avoids the CORS problem we'd hit
// reading Google's response directly from the browser.
//
// Vercel hard-caps every Function's request body at 4.5MB regardless of
// runtime, so a whole exterior/external zip (10MB+) can't be sent in one
// request — it has to go up in chunks, using Drive's own resumable-upload
// protocol (a Content-Range chunk per request). Interior zips happen to
// fit under that cap in a single chunk, which is why only exterior/external
// captures were failing.
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MiB — under Vercel's cap, a multiple of Drive's required 256KiB granularity.

export async function saveBlobToDrive(
  blob: Blob,
  filename: string,
): Promise<void> {
  const total = blob.size;
  let start = 0;
  let uploadUrl: string | null = null;

  do {
    const end = Math.min(start + CHUNK_SIZE, total);
    const chunk = blob.slice(start, end);
    const headers: Record<string, string> = {
      "Content-Type": "application/zip",
      "Content-Range": `bytes ${start}-${end - 1}/${total}`,
    };
    if (uploadUrl) {
      headers["X-Upload-Url"] = uploadUrl;
    } else {
      headers["X-File-Name"] = encodeURIComponent(filename);
    }

    const res = await fetch("/api/upload-to-drive", {
      method: "POST",
      headers,
      body: chunk,
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || `Drive upload failed (${res.status}).`);
    }
    if (data?.done) return;

    uploadUrl = data?.uploadUrl ?? uploadUrl;
    start = end;
  } while (start < total);
}
