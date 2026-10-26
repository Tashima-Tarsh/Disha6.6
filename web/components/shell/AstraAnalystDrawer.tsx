export function readAssistantReply(payload: unknown): string {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) throw new Error("no readable reply");
    return payload;
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.response === "string" && obj.response.trim()) return obj.response;
    if (typeof obj.reply === "string" && obj.reply.trim()) return obj.reply;
    if (typeof obj.message === "string" && obj.message.trim()) return obj.message;
  }
  throw new Error("no readable reply");
}
