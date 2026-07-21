# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Google Drive save

The viewer has a "save to drive" button next to "save all". Every capture — from anyone using the app — uploads into **one folder in your own Google Drive**. End users never sign into Google; the credentials live server-side in a Vercel serverless function ([api/upload-to-drive.ts](api/upload-to-drive.ts)), so this app must be deployed on Vercel (not GitHub Pages, which can't run server code).

### 1. Deploy this repo to Vercel

Import the repo at [vercel.com/new](https://vercel.com/new). It auto-detects Vite; no config needed beyond the environment variables below.

### 2. Create a Google Cloud OAuth client

1. In the [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project, then enable the **Google Drive API** under APIs & Services > Library.
2. Under APIs & Services > OAuth consent screen, configure an External consent screen, add scope `https://www.googleapis.com/auth/drive`, and add yourself as a test user.
   - Set publishing status to **In production** (Publish app) once you're ready — while it stays in "Testing," Google expires refresh tokens after 7 days. You'll still see an "unverified app" warning during the one-time authorization below; that's expected since only you are authorizing it. Verification review is only required if you request verification or exceed 100 users.
3. Under APIs & Services > Credentials, create an **OAuth Client ID** of type **Web application**, with `https://developers.google.com/oauthplayground` as an Authorized redirect URI (only needed for the one-time step below). Note the Client ID and Client Secret.

### 3. Mint a refresh token (one-time, as yourself)

1. Go to the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the gear icon (top right) > check **Use your own OAuth credentials** > paste in your Client ID and Client Secret.
3. In the left panel, find **Drive API v3** and select the scope `https://www.googleapis.com/auth/drive`. Click **Authorize APIs** and sign in as yourself.
4. Click **Exchange authorization code for tokens**. Copy the **Refresh token** shown.

### 4. Pick a destination folder

Create (or open) the Drive folder you want captures saved into, and copy its ID from the URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`.

### 5. Set environment variables

In Vercel (Project Settings > Environment Variables) — and locally in a `.env` file if you want to test with `vercel dev` — set:

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=the-refresh-token-from-step-3
GOOGLE_DRIVE_FOLDER_ID=the-folder-id-from-step-4
```

These are server-only (no `VITE_` prefix) so they never reach the browser bundle.

### Local development

Plain `npm run dev` (Vite) doesn't serve the `/api` function, so "save to drive" will fail locally unless you run `npx vercel dev` instead, which serves both the frontend and the API route together.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
