import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";
import { isProductionEnvironment } from "@/lib/constants";
import { ChatbotError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const { message, messages, selectedChatModel } = requestBody;

    const modelId = selectedChatModel ?? DEFAULT_CHAT_MODEL;

    const uiMessages: ChatMessage[] = messages
      ? (messages as unknown as ChatMessage[])
      : message
        ? [message as unknown as ChatMessage]
        : [];

    if (uiMessages.length === 0) {
      return new ChatbotError("bad_request:api").toResponse();
    }

    const modelMessages = await convertToModelMessages(uiMessages);

    // Azure Foundry rejects inline assistant messages that carry a `msg_*` id
    // from a previous response (because `store` is false by default and the
    // referenced item was never persisted server-side). Strip the openai
    // itemId so prior turns are re-sent as fresh content.
    for (const m of modelMessages) {
      if (m.role !== "assistant") {
        continue;
      }
      const content = Array.isArray(m.content) ? m.content : [];
      for (const part of content) {
        const openaiOpts = (
          part as { providerOptions?: { openai?: { itemId?: string } } }
        ).providerOptions?.openai;
        if (openaiOpts?.itemId) {
          openaiOpts.itemId = undefined;
        }
      }
    }

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(modelId),
          messages: modelMessages,
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        dataStream.merge(result.toUIMessageStream());
      },
      generateId: generateUUID,
      onError: () => "Oops, an error occurred!",
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error);
    return new ChatbotError("offline:chat").toResponse();
  }
}
