export const DEFAULT_CHAT_MODEL =
  process.env.NEXT_PUBLIC_LLM_MODEL_ID ?? "default";

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: DEFAULT_CHAT_MODEL,
    name: process.env.NEXT_PUBLIC_LLM_MODEL_NAME ?? "Assistant",
    provider: "custom",
    description: "Default assistant",
  },
];

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);

export function getActiveModels(): ChatModel[] {
  return chatModels;
}
