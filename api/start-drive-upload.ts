import type { VercelRequest, VercelResponse } from "@vercel/node";

// This endpoint only exchanges credentials for a short-lived Google Drive
// "resumable upload" session URL — it never sees the actual file bytes, so
// it isn't subject to Vercel's request body size limit. The browser then
// PUTs the file directly to the returned Google URL (see src/lib/googleDrive.ts).
export const config = {
  maxDuration: 30,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
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
    res.status(500).json({ error: "Drive upload isn't configured on the server." });
    return;
  }

  const { filename } = (req.body ?? {}) as { filename?: string };
  if (!filename) {
    res.status(400).json({ error: "Missing filename." });
    return;
  }

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
    res.status(200).json({ uploadUrl });
  } catch (err) {
    console.error("Drive upload session error:", err);
    res.status(502).json({ error: (err as Error).message });
  }
}
