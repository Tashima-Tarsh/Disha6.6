import fs from "fs/promises";
import { constants } from "node:fs";
import { audit } from "@/lib/server/audit";
import { checkedWorkspacePath } from "@/lib/server/security";
import type { RequestContext } from "@/lib/server/types";

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  ico: "image/x-icon",
};

export async function readWorkspaceFile(ctx: RequestContext, filePath: string) {
  const resolvedPath = await checkedWorkspacePath(filePath);
  const stats = await fs.stat(resolvedPath);
  if (stats.isDirectory()) throw Object.assign(new Error("path is a directory"), { status: 400 });
  if (stats.size > 2_000_000) throw Object.assign(new Error("file too large"), { status: 413 });

  const ext = resolvedPath.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ext in IMAGE_MIME;
  const raw = isImage
    ? await fs.readFile(resolvedPath)
    : await fs.readFile(resolvedPath, { encoding: "utf8" });
  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "file.read",
    resource: filePath,
    outcome: "success",
    metadata: { size: stats.size },
  });

  return {
    content: isImage ? `data:${IMAGE_MIME[ext]};base64,${Buffer.from(raw).toString("base64")}` : raw,
    isImage: isImage || ext === "svg",
    size: stats.size,
    modified: stats.mtime.toISOString(),
  };
}

export async function writeWorkspaceFile(ctx: RequestContext, filePath: string, content: string) {
  const resolvedPath = await checkedWorkspacePath(filePath, true);
  const handle = await fs.open(resolvedPath, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, 0o600);
  try { await handle.writeFile(content, "utf-8"); } finally { await handle.close(); }
  const stats = await fs.stat(resolvedPath);
  await audit({
    requestId: ctx.requestId,
    userId: ctx.principal.userId,
    action: "file.write",
    resource: filePath,
    outcome: "success",
    metadata: { size: stats.size },
  });
  return { success: true, size: stats.size };
}
