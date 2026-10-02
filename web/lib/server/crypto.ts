import crypto from "node:crypto";

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

export function hashSecret(secret: string, salt = crypto.randomBytes(16).toString("base64url")) {
  const hash = crypto.scryptSync(secret, salt, 64).toString("base64url");
  return `${salt}:${hash}`;
}

export function verifySecret(secret: string, encoded: string): boolean {
  const [salt, expectedHash] = encoded.split(":");
  if (!salt || !expectedHash) return false;
  const actual = crypto.scryptSync(secret, salt, Buffer.from(expectedHash, "base64url").length);
  const expected = Buffer.from(expectedHash, "base64url");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function signJson(payload: Record<string, unknown>, secret: string): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifySignedJson(token: string, secret: string): Record<string, unknown> {
  if (token.split(".").length !== 3) throw new Error("Malformed token");
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) throw new Error("Malformed token");
  const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  const signatureBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (
    signatureBytes.length !== expectedBytes.length ||
    !crypto.timingSafeEqual(signatureBytes, expectedBytes)
  ) {
    throw new Error("Invalid token signature");
  }
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp) || parsed.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return parsed;
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
