# Deploying to Azure App Service

Azure App Service for Linux runs Next.js natively on its Node runtime — no container required. This guide uses the convenient path: **build locally with Next.js standalone output, then ZIP-deploy**.

---

## Why standalone output

By default, `next build` produces a `.next/` directory that still depends on `node_modules`. Uploading ~400 MB of dependencies to App Service is slow and triggers its Oryx build step, which is flaky for Next.js.

With `output: "standalone"`, Next.js emits a self-contained `.next/standalone/` directory containing `server.js`, trimmed `node_modules`, and runtime files — typically 30–80 MB. You upload exactly that, point App Service at `server.js`, and you are done.

## 1. Enable standalone output

Add one line to [next.config.ts](next.config.ts):

```ts
const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  // ...existing config
};
```

## 2. Provision the App Service

In the Azure Portal (or via CLI):

```bash
# Variables
RG=rg-chatbot
APP=chatbot-foundry            # must be globally unique
PLAN=plan-chatbot
LOCATION=westeurope

# Resource group + Linux plan (B1 is the cheapest tier that keeps the app warm)
az group create -n $RG -l $LOCATION
az appservice plan create -g $RG -n $PLAN --is-linux --sku B1

# Web app on Node 20 LTS
az webapp create -g $RG -p $PLAN -n $APP --runtime "NODE:20-lts"
```

**Runtime:** Node 20 LTS or newer. Next.js 16 will not start on Node 18.

**SKU sizing:** `B1` (1 vCPU / 1.75 GB) is the practical minimum for a streaming LLM app. For production, `P0v3`/`P1v3` gets you warm starts and autoscale.

## 3. Configure environment variables

App Service injects **Application Settings** as environment variables at runtime. Set them via portal or CLI:

```bash
az webapp config appsettings set -g $RG -n $APP --settings \
  LLM_ENDPOINT="https://<resource>.services.ai.azure.com/api/projects/<project>/applications/<agent>/protocols/openai" \
  LLM_API_KEY="<key>" \
  LLM_AUTH_HEADER="api-key" \
  LLM_API_VERSION="2025-11-15-preview" \
  LLM_TITLE_MODEL_ID="gpt-4.1-mini" \
  NEXT_PUBLIC_LLM_MODEL_ID="gpt-4.1-mini" \
  NEXT_PUBLIC_LLM_MODEL_NAME="Assistant" \
  WEBSITE_NODE_DEFAULT_VERSION="~20" \
  SCM_DO_BUILD_DURING_DEPLOYMENT="false"
```

### Critical: `NEXT_PUBLIC_*` is build-time, not runtime

Next.js inlines `NEXT_PUBLIC_*` variables into the client JS bundle **during `next build`**. Setting them on App Service alone will not affect what ships to the browser. You must ensure they are present in `.env.local` (or exported in your shell) *when you run `pnpm build` locally*. The App Service setting is still useful because the same values are read server-side.

### Recommended App Service settings

| Setting | Value | Why |
| --- | --- | --- |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | We upload a pre-built standalone bundle; do not let Oryx re-run `npm install`. |
| `WEBSITES_ENABLE_APP_SERVICE_STORAGE` | `true` | Default. Keeps the writable `/home` mount. |
| `NODE_ENV` | `production` | Standard. |
| `PORT` | *(leave unset)* | App Service assigns this automatically; Next.js `server.js` respects it. |

## 4. Set the startup command

Standalone output emits `server.js` at the bundle root. Tell App Service to run it:

```bash
az webapp config set -g $RG -n $APP --startup-file "node server.js"
```

## 5. Build and deploy

Standalone output does **not** automatically copy `public/` or `.next/static/` into the bundle. You must stage those yourself.

### macOS / Linux

```bash
# 1. Build with production env vars available (reads .env.local)
pnpm install --frozen-lockfile
pnpm build

# 2. Assemble the deployable tree
rm -rf deploy && mkdir deploy
cp -r .next/standalone/. deploy/
cp -r .next/static       deploy/.next/static
cp -r public             deploy/public

# 3. Zip and deploy
cd deploy && zip -r ../app.zip . && cd ..
az webapp deploy -g $RG -n $APP --src-path app.zip --type zip
```

### Windows PowerShell

```powershell
# 1. Build with production env vars available (reads .env.local)
pnpm install --frozen-lockfile
pnpm build

# 2. Assemble the deployable tree
if (Test-Path deploy) { Remove-Item -Recurse -Force deploy }
New-Item -ItemType Directory -Path deploy | Out-Null
Copy-Item -Recurse .next\standalone\* deploy\
Copy-Item -Recurse .next\static       deploy\.next\static
Copy-Item -Recurse public             deploy\public

# 3. Zip and deploy
if (Test-Path app.zip) { Remove-Item app.zip }
Compress-Archive -Path deploy\* -DestinationPath app.zip
az webapp deploy -g $RG -n $APP --src-path app.zip --type zip
```

## 6. Verify

```bash
# Tail logs
az webapp log tail -g $RG -n $APP

# Hit the app
curl -I https://$APP.azurewebsites.net
```

You should see `✓ Ready in …ms` from Next.js in the logs and a `200` from the root path.

---

## Troubleshooting

**App starts but returns `Application Error`.**
Check logs: `az webapp log tail`. Most common causes are a missing `server.js` (you deployed the root repo instead of the assembled standalone tree) or a missing `LLM_*` env var crashing the first request.

**Client shows `Assistant` instead of your model name, or requests fail with an empty model ID.**
`NEXT_PUBLIC_LLM_MODEL_ID` was not set at **build time**. Confirm it is in `.env.local`, then rebuild and redeploy.

**Streaming responses hang / disconnect after 30 seconds.**
App Service's default idle timeout is 230 s, so it should not be the culprit — but a Front Door / Application Gateway in front of it might be. Check any upstream proxy timeouts.

**Oryx tries to build anyway.**
Confirm `SCM_DO_BUILD_DURING_DEPLOYMENT=false` is set, and that you are deploying the assembled `deploy/` folder (zipped), not the repo root.

**Cold starts are slow.**
Enable **Always On** (`az webapp config set --always-on true`). Requires Basic tier or higher.
