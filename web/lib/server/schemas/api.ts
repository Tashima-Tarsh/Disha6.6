import { z } from "zod";

const contentBlockSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("tool_use"),
    id: z.string(),
    name: z.string(),
    input: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("tool_result"),
    tool_use_id: z.string(),
    content: z.union([z.string(), z.array(z.object({ type: z.literal("text"), text: z.string() }))]),
    is_error: z.boolean().optional(),
  }),
]);

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.union([z.string(), z.array(contentBlockSchema)]),
  status: z.enum(["pending", "streaming", "complete", "error"]),
  createdAt: z.number(),
  model: z.string().optional(),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).optional(),
});

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  messages: z.array(messageSchema).max(500),
  createdAt: z.number(),
  updatedAt: z.number(),
  model: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(256),
  rememberMe: z.boolean().optional().default(true),
});

export const otpRequestSchema = z.object({
  mobile: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Mobile number must include 10 to 15 digits"),
});

export const otpVerifySchema = otpRequestSchema.extend({
  code: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const oidcStartSchema = z.object({
  provider: z.literal("meri-pehchan"),
  returnUrl: z.string().optional(),
});

export const chatRequestSchema = z.record(z.string(), z.unknown()).refine(
  (value) => JSON.stringify(value).length <= 100_000,
  "Request body too large",
);

export const fileReadSchema = z.object({
  path: z.string().min(1).max(2048),
});

export const fileWriteSchema = z.object({
  path: z.string().min(1).max(2048),
  content: z.string().max(2_000_000),
});

export const exportRequestSchema = z.object({
  conversation: conversationSchema,
  options: z.object({
    format: z.enum(["markdown", "json", "html", "pdf", "plaintext"]),
    includeToolUse: z.boolean(),
    includeThinking: z.boolean(),
    includeTimestamps: z.boolean(),
    includeFileContents: z.boolean(),
    dateRange: z.object({ start: z.number(), end: z.number() }).optional(),
  }),
});

export const createShareSchema = z.object({
  conversation: conversationSchema,
  visibility: z.enum(["public", "unlisted", "password"]),
  password: z.string().min(12).max(256).optional(),
  expiry: z.enum(["1h", "24h", "7d", "30d", "never"]),
}).refine((value) => value.visibility !== "password" || !!value.password, {
  message: "Password required for password-protected shares",
});
