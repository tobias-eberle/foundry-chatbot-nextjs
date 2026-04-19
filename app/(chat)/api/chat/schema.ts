import { z } from "zod";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(8000),
});

const partSchema = textPartSchema;

const userMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user"]),
  parts: z.array(partSchema),
});

export const postRequestBodySchema = z.object({
  id: z.string(),
  message: userMessageSchema.optional(),
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        parts: z.array(z.record(z.unknown())),
      })
    )
    .optional(),
  selectedChatModel: z.string().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
