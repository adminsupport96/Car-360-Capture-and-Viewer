// Runs on Vercel's Edge Runtime (not the Node.js serverless runtime) so the
// request body is streamed straight through to Google, never buffered into
// a single in-memory Buffer. Two things that broke on larger files with the
// previous approaches now go away:
//   - Node serverless functions hard-cap request bodies at ~4.5MB, which
//     interior captures (few frames, <5MB) slipped under but exterior/orbit
//     captures (10MB+) never did.
//   - Uploading directly from the browser to Google's resumable endpoint
//     avoided that cap, but made the browser read Google's response
//     cross-origin — which got blocked by CORS, so the app reported
//     "failed" even after Drive had already saved the file.
// Relaying through our own origin (this Edge Function) sidesteps both: the
// browser only ever talks to our domain, and we stream — not buffer — the
// bytes on to Drive.
export const config = {
  runtime: "edge",
};

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function startResumableSession(
  filename: string,
  folderId: string,
  accessToken: string,
): Promise<string> {
  const metadata = { name: filename, parents: [folderId] };

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/zip",
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Starting Drive upload session failed (${res.status}): ${body}`);
  }

  const uploadUrl = res.headers.get("location");
  if (!uploadUrl) {
    throw new Error("Drive did not return a resumable upload URL.");
  }
  return uploadUrl;
}

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN,
    GOOGLE_DRIVE_FOLDER_ID,
  } = process.env;

  if (
    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET ||
    !GOOGLE_REFRESH_TOKEN ||
    !GOOGLE_DRIVE_FOLDER_ID
  ) {
    return jsonResponse(500, { error: "Drive upload isn't configured on the server." });
  }

  if (!req.body) {
    return jsonResponse(400, { error: "Empty upload body." });
  }

  const rawFilename = req.headers.get("x-file-name");
  const filename = rawFilename ? decodeURIComponent(rawFilename) : "capture.zip";
  const contentLength = req.headers.get("content-length");

  try {
    const accessToken = await getAccessToken(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN,
    );
    const uploadUrl = await startResumableSession(
      filename,
      GOOGLE_DRIVE_FOLDER_ID,
      accessToken,
    );

    // Stream the client's request body straight on to Drive — this process
    // never holds the whole file in memory, unlike the old Node handler.
    const driveRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/zip",
        ...(contentLength ? { "Content-Length": contentLength } : {}),
      },
      body: req.body,
      // Required by the Fetch spec whenever a streaming body is attached.
      duplex: "half",
    } as RequestInit);

    if (!driveRes.ok) {
      const body = await driveRes.text().catch(() => "");
      return jsonResponse(502, { error: body || `Drive upload failed (${driveRes.status}).` });
    }

    const data = (await driveRes.json()) as { id: string };
    return jsonResponse(200, { id: data.id });
  } catch (err) {
    console.error("Drive upload error:", err);
    return jsonResponse(502, { error: (err as Error).message });
  }
}
