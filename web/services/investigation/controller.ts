import { NextRequest, NextResponse } from "next/server";
import { withContext } from "../../lib/unified/api";
import type { RequestContext } from "../../lib/server/types";
import { investigations } from "./service";
import { MAX_IMAGE_BYTES } from "./image";

export function investigationResponse(req: NextRequest, operation: (ctx: RequestContext) => Promise<unknown>) {
  return withContext(req, req.method === "GET" ? "agent:read" : "agent:run", async ctx => {
    try {
      const result = await operation(ctx);
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store, max-age=0", "X-Request-ID": ctx.requestId } });
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 503;
      const message = status < 500 && error instanceof Error ? error.message : "INVESTIGATION SERVICE UNAVAILABLE. Check temporary storage and retry.";
      return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store", "X-Request-ID": ctx.requestId } });
    }
  });
}
async function boundedBody(req: NextRequest, limit: number): Promise<Buffer> {
  const reader = req.body?.getReader();
  if (!reader) throw Object.assign(new Error("Request body required"), { status: 400 });
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw Object.assign(new Error("Request is too large"), { status: 413 });
      parts.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(parts);
}
export async function createText(req: NextRequest, ctx: RequestContext) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) throw Object.assign(new Error("JSON body required"), { status: 415 });
  let body: unknown;
  try { body = JSON.parse((await boundedBody(req, 4096)).toString("utf8")); }
  catch (error) {
    if (error && typeof error === "object" && "status" in error) throw error;
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
  return investigations.create(body, ctx);
}
export async function createImage(req: NextRequest, ctx: RequestContext) {
  if (!req.headers.get("content-type")?.startsWith("multipart/form-data")) throw Object.assign(new Error("Multipart image upload required"), { status: 415 });
  const bytes = await boundedBody(req, MAX_IMAGE_BYTES + 16_384);
  try {
    const form = await new Response(new Uint8Array(bytes), { headers: { "content-type": req.headers.get("content-type")! } }).formData();
    const file = form.get("image");
    if (!(file instanceof File) || form.getAll("image").length !== 1) throw Object.assign(new Error("One image file is required"), { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) throw Object.assign(new Error("Maximum image size is 5 MB"), { status: 413 });
    const image = Buffer.from(await file.arrayBuffer());
    try { return await investigations.create(undefined, ctx, { bytes: image, type: file.type }); }
    finally { image.fill(0); }
  } finally { bytes.fill(0); }
}
