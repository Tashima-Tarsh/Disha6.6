import crypto from "node:crypto";
import fs from "node:fs";
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
  await assertRequestGuards(req);
  const principal = requirePrincipal(req);
  assertCan(principal, action);
  return { requestId: requestId(req), principal };
}

const SENSITIVE_PATTERNS = [
  /(^|[/\\])\.env/i,
  /(^|[/\\])\.git([/\\]|$)/i,
  /(^|[/\\])id_rsa/i,
  /\.pem$/i,
  /\.key$/i,
  /secret/i,
  /credential/i,
  /password/i,
  /token/i,
  /database\.sqlite/i,
];

export function resolveWorkspacePath(inputPath: string): string {
  const root = process.env.DISHA_WORKSPACE_ROOT
    ? path.resolve(process.env.DISHA_WORKSPACE_ROOT)
    : path.resolve(/* turbopackIgnore: true */ process.cwd());

  const normInput = path.normalize(inputPath).replace(/\\/g, "/");

  // 1. Lexical traversal guard
  if (normInput.startsWith("..") || path.isAbsolute(inputPath)) {
    throw Object.assign(new Error("path escapes workspace root"), { status: 403 });
  }

  // 2. Sensitive files and secrets denylist
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(normInput)) {
      throw Object.assign(new Error(`Access to sensitive file or secret '${normInput}' is prohibited`), {
        status: 403,
      });
    }
  }

  const resolved = path.resolve(root, inputPath);
  const relative = path.relative(root, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw Object.assign(new Error("path escapes workspace root"), { status: 403 });
  }

  // 3. Symlink canonicalization and escape prevention
  try {
    const canonicalRoot = fs.realpathSync(root);
    if (fs.existsSync(resolved)) {
      const canonicalResolved = fs.realpathSync(resolved);
      const canonicalRel = path.relative(canonicalRoot, canonicalResolved);
      if (canonicalRel.startsWith("..") || path.isAbsolute(canonicalRel)) {
        throw Object.assign(new Error("Symlink resolution escapes workspace root"), { status: 403 });
      }
    } else {
      // For paths that do not exist yet (e.g. pending write), check nearest existing ancestor
      let ancestor = path.dirname(resolved);
      while (!fs.existsSync(ancestor) && ancestor !== path.dirname(ancestor)) {
        ancestor = path.dirname(ancestor);
      }
      if (fs.existsSync(ancestor)) {
        const canonicalAncestor = fs.realpathSync(ancestor);
        const ancestorRel = path.relative(canonicalRoot, canonicalAncestor);
        if (ancestorRel.startsWith("..") || path.isAbsolute(ancestorRel)) {
          throw Object.assign(new Error("Symlink directory escapes workspace root"), { status: 403 });
        }
      }
    }
  } catch (err: any) {
    if (err.status === 403) throw err;
    // If realpathSync fails due to ENOENT or access, maintain lexical containment
  }

  return resolved;
}
