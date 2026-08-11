// The zip is posted to our own /api/upload-to-drive (an Edge Function — see
// that file for why), which streams it on to Google Drive server-to-server.
// Keeping this a same-origin request avoids two problems we hit going
// straight from the browser to Google: CORS blocking the response read, and
// Vercel's Node serverless body-size cap truncating larger exterior/orbit
// captures.
export async function saveBlobToDrive(
  blob: Blob,
  filename: string,
): Promise<void> {
  const res = await fetch("/api/upload-to-drive", {
    method: "POST",
    headers: {
      "Content-Type": "application/zip",
      "X-File-Name": encodeURIComponent(filename),
    },
    body: blob,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Drive upload failed (${res.status}).`);
  }
}
