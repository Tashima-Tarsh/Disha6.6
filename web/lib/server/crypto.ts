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

// Pepper-backed HMAC input for password hashing. The pepper is a server-side
// secret held in the secret manager (DISHA_AUTH_PEPPER), never in the database.
export function hmacPepper(password: string): Buffer {
  const raw = process.env.DISHA_AUTH_PEPPER;
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DISHA_AUTH_PEPPER is required in production");
    }
    return crypto.createHash("sha256").update("disha-dev-pepper-ephemeral").digest();
  }
  let pepper: Buffer;
  try {
    pepper = Buffer.from(raw, "hex");
    if (pepper.length !== 32) throw new Error("bad-length");
  } catch {
    try {
      pepper = Buffer.from(raw, "base64");
      if (pepper.length !== 32) throw new Error("bad-length");
    } catch {
      pepper = crypto.createHash("sha256").update(raw, "utf8").digest();
    }
  }
  return crypto.createHmac("sha256", pepper).update(password).digest();
}

export function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signJson(payload: Record<string, unknown>, secret: string): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function verifySignedJson(token: string, secret: string): Record<string, unknown> {
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
  if (typeof parsed.exp === "number" && parsed.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return parsed;
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
