# Lean Enterprise Chatbot

A minimal, deployment-agnostic chatbot built with Next.js and the AI SDK. Points at any OpenAI-compatible Responses API endpoint — including Azure AI Foundry agents, Azure OpenAI, OpenAI, or a local proxy.

The template is intentionally stateless and auth-free: no database, no user accounts, no file uploads. Reloading the page starts a fresh chat session. Hooks for chat history and file attachments remain in the UI as "Coming soon" placeholders so they can be re-enabled without restructuring the app.

## What's included

- **Next.js 16** App Router, React 19, TypeScript, Tailwind CSS
- **AI SDK v6** (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`) — streaming via `streamText` + `createUIMessageStream`
- **shadcn/ui** components on top of Radix primitives
- A single chat route (`app/(chat)/api/chat/route.ts`) that forwards messages to the configured LLM endpoint
- One built-in tool: `getWeather`

## What's intentionally out

- No authentication, middleware, or user sessions — the app is public
- No database, chat history, or message persistence
- No file uploads or blob storage
- No Vercel-specific configuration (`vercel.json`, AI Gateway, `@vercel/*` packages)
- No artifacts / document editor / suggestion features

## Configuration

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Purpose |
| --- | --- |
| `LLM_ENDPOINT` | Base URL of the OpenAI-compatible Responses API |
| `LLM_API_KEY` | Credential sent with each request |
| `LLM_AUTH_HEADER` | `api-key` for Azure Foundry / Azure OpenAI; leave blank for OpenAI (`Authorization: Bearer`) |
| `LLM_API_VERSION` | Optional query parameter (e.g. `2025-11-15-preview` for Azure Foundry) |
| `NEXT_PUBLIC_LLM_MODEL_ID` | Model identifier sent in the request body. For Foundry agents, this is the agent's **underlying** model (e.g. `gpt-4.1-mini`) — the agent itself is selected via the URL path. |
| `NEXT_PUBLIC_LLM_MODEL_NAME` | Display name in the model selector (defaults to `Assistant`) |
| `LLM_TITLE_MODEL_ID` | Optional override for the title-generation model |

### Azure AI Foundry example

```
LLM_ENDPOINT=https://<resource>.services.ai.azure.com/api/projects/<project>/applications/<agent>/protocols/openai
LLM_API_KEY=<key>
LLM_AUTH_HEADER=api-key
LLM_API_VERSION=2025-11-15-preview
# Agent's underlying model — NOT the agent name (agent is in the URL path above)
NEXT_PUBLIC_LLM_MODEL_ID=gpt-4.1-mini
NEXT_PUBLIC_LLM_MODEL_NAME=Grumpy Agent
```

### OpenAI example

```
LLM_ENDPOINT=https://api.openai.com/v1
LLM_API_KEY=sk-...
LLM_AUTH_HEADER=
NEXT_PUBLIC_LLM_MODEL_ID=gpt-4o-mini
NEXT_PUBLIC_LLM_MODEL_NAME=GPT-4o mini
```

## Running locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

The app has no vendor-specific runtime requirements — any platform that runs Next.js (Vercel, Azure Container Apps, AWS, a Docker host) will work. Set the environment variables above in your target environment.
