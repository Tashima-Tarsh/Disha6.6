import crypto from "node:crypto";
import path from "node:path";
import type { NextRequest } from "next/server";
import { requirePrincipal } from "./auth";
import { assertRequestGuards } from "./http";
import { assertCan } from "./policy";
import type { PolicyAction, RequestContext } from "./types";

export function requestId(req: NextRequest): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export async function requireRequestContext(req: NextRequest, action: PolicyAction): Promise<RequestContext> {
  const principal = await requirePrincipal(req);
  await assertRequestGuards(req);
  assertCan(principal, action);
  return { requestId: requestId(req), principal };
}

export function resolveWorkspacePath(inputPath: string): string {
  const root = process.env.DISHA_WORKSPACE_ROOT
    ? path.resolve(process.env.DISHA_WORKSPACE_ROOT)
    : path.resolve(/* turbopackIgnore: true */ process.cwd());
  const resolved = path.resolve(root, inputPath);
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("path escapes workspace root");
  }

  return resolved;
}

/** Reject symlinks and secret files; a production workspace is an explicit data directory. */
export async function checkedWorkspacePath(inputPath: string, createParents = false): Promise<string> {
  const fs = await import("node:fs/promises");
  if (process.env.NODE_ENV === "production" && !process.env.DISHA_WORKSPACE_ROOT) {
    throw Object.assign(new Error("File workspace is not configured"), { status: 503 });
  }
  const resolved = resolveWorkspacePath(inputPath);
  const root = process.env.DISHA_WORKSPACE_ROOT ? path.resolve(process.env.DISHA_WORKSPACE_ROOT) : path.resolve(process.cwd());
  const segments = path.relative(root, resolved).split(path.sep);
  if (segments.some((part) => part.startsWith(".") || /^(?:node_modules|package-lock\.json)$/i.test(part)) || /\.(pem|key|p12|pfx|db|sqlite)$/i.test(resolved)) {
    throw Object.assign(new Error("Restricted workspace file"), { status: 403 });
  }
  let current = await fs.realpath(root);
  for (let index = 0; index < segments.length; index++) {
    current = path.join(current, segments[index]);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) throw Object.assign(new Error("Workspace symlinks are not allowed"), { status: 403 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      if (createParents && index < segments.length - 1) await fs.mkdir(current);
      else if (index < segments.length - 1) throw error;
    }
  }
  return current;
}
