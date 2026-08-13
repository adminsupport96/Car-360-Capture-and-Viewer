// Runs on Vercel's Edge Runtime so the request body is streamed straight
// through to Google, never buffered into a single in-memory Buffer.
//
// That said, streaming does NOT get us past Vercel's request body cap: every
// Vercel Function — Node or Edge — hard-caps request/response bodies at
// 4.5MB, enforced by Vercel's own routing layer in front of the function,
// independent of how the function itself reads the body. A whole exterior/
// external zip (10MB+) never reaches this code at all if sent in one shot.
//
// So instead of relaying the whole file in a single request, the client
// speaks Google Drive's resumable-upload protocol directly: it starts a
// session (this function, first call) and then PUTs the file in
// Content-Range chunks that each stay under Vercel's cap (see
// src/lib/googleDrive.ts). This function is a thin per-chunk relay — it
// never sees more than one chunk's worth of bytes at a time.
//
// Uploading the chunks directly from the browser to Google (skipping this
// relay) was tried previously and avoided the cap, but the browser can't
// read Google's response cross-origin, which CORS blocks — so the app
// reported "failed" even after Drive had already saved the file. Relaying
// through our own origin sidesteps that: the browser only ever talks to our
// domain, and we forward Drive's real status back.
export const config = {
  runtime: "edge",
};

const DRIVE_UPLOAD_HOST = "www.googleapis.com";
const DRIVE_UPLOAD_PATH_PREFIX = "/upload/drive/v3/files";

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

// The client hands back whatever session URL Drive gave us on the first
// chunk, so subsequent chunk requests need to trust it before we fetch()
// it server-side — otherwise a malicious client could point this relay at
// an arbitrary host (SSRF).
function isValidUploadUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      url.hostname === DRIVE_UPLOAD_HOST &&
      url.pathname.startsWith(DRIVE_UPLOAD_PATH_PREFIX)
    );
  } catch {
    return false;
  }
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

  const contentRange = req.headers.get("content-range");
  if (!contentRange) {
    return jsonResponse(400, { error: "Missing Content-Range header." });
  }

  const requestedUploadUrl = req.headers.get("x-upload-url");
  const contentLength = req.headers.get("content-length");

  try {
    let uploadUrl: string;
    if (requestedUploadUrl) {
      if (!isValidUploadUrl(requestedUploadUrl)) {
        return jsonResponse(400, { error: "Invalid upload session URL." });
      }
      uploadUrl = requestedUploadUrl;
    } else {
      // First chunk: no session yet, so start one.
      const rawFilename = req.headers.get("x-file-name");
      const filename = rawFilename ? decodeURIComponent(rawFilename) : "capture.zip";
      const accessToken = await getAccessToken(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REFRESH_TOKEN,
      );
      uploadUrl = await startResumableSession(
        filename,
        GOOGLE_DRIVE_FOLDER_ID,
        accessToken,
      );
    }

    // Stream this one chunk straight on to Drive — this process never holds
    // more than one chunk's worth of bytes in memory.
    const driveRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/zip",
        "Content-Range": contentRange,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
      },
      body: req.body,
      // Required by the Fetch spec whenever a streaming body is attached.
      duplex: "half",
    } as RequestInit);

    // 308 = Drive has this chunk and is waiting for the rest — not an error,
    // even though it's outside fetch's 200-299 "ok" range.
    if (driveRes.status === 308) {
      return jsonResponse(202, { done: false, uploadUrl });
    }

    if (!driveRes.ok) {
      const body = await driveRes.text().catch(() => "");
      return jsonResponse(502, { error: body || `Drive upload failed (${driveRes.status}).` });
    }

    const data = (await driveRes.json()) as { id: string };
    return jsonResponse(200, { done: true, id: data.id });
  } catch (err) {
    console.error("Drive upload error:", err);
    return jsonResponse(502, { error: (err as Error).message });
  }
}
