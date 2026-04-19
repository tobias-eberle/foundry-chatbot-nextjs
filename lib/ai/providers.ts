import { createOpenAI } from "@ai-sdk/openai";

const rawEndpoint = process.env.LLM_ENDPOINT ?? "";
// provider.responses() appends "/responses" itself — strip it (and any trailing slash)
// if the user pasted the full Azure Foundry Responses URL.
const endpoint = rawEndpoint.replace(/\/+$/, "").replace(/\/responses$/, "");
const apiKey = process.env.LLM_API_KEY ?? "";
const apiVersion = process.env.LLM_API_VERSION ?? "";
const authHeader = process.env.LLM_AUTH_HEADER ?? "api-key";

const fetchWithApiVersion: typeof fetch = (input, init) => {
  const url = new URL(
    typeof input === "string" || input instanceof URL
      ? input.toString()
      : input.url
  );
  if (apiVersion && !url.searchParams.has("api-version")) {
    url.searchParams.set("api-version", apiVersion);
  }
  return fetch(url.toString(), init);
};

const provider = createOpenAI({
  baseURL: endpoint,
  apiKey,
  headers: authHeader === "api-key" ? { "api-key": apiKey } : undefined,
  fetch: fetchWithApiVersion,
});

export function getLanguageModel(modelId: string) {
  return provider.responses(modelId);
}

export function getTitleModel() {
  return provider.responses(
    process.env.LLM_TITLE_MODEL_ID ?? process.env.LLM_MODEL_ID ?? ""
  );
}
