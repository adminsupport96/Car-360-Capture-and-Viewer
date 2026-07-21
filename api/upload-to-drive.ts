import type { VercelRequest, VercelResponse } from "@vercel/node";

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

async function uploadToDrive(
  buffer: Buffer,
  filename: string,
  folderId: string,
  accessToken: string,
): Promise<string> {
  const boundary = `car360-${Date.now()}`;
  const metadata = { name: filename, parents: [folderId] };

  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: application/zip\r\n\r\n`,
      "utf-8",
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`, "utf-8"),
  ]);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Drive upload failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
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

  const body = req.body as Buffer | undefined;
  if (!body || !body.length) {
    res.status(400).json({ error: "Empty upload body." });
    return;
  }

  const filenameHeader = req.headers["x-file-name"];
  const rawFilename = Array.isArray(filenameHeader)
    ? filenameHeader[0]
    : filenameHeader;
  const filename = rawFilename
    ? decodeURIComponent(rawFilename)
    : "capture.zip";

  try {
    const accessToken = await getAccessToken(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN,
    );
    const fileId = await uploadToDrive(
      body,
      filename,
      GOOGLE_DRIVE_FOLDER_ID,
      accessToken,
    );
    res.status(200).json({ id: fileId });
  } catch (err) {
    console.error("Drive upload error:", err);
    res.status(502).json({ error: (err as Error).message });
  }
}
