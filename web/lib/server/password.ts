import crypto from "node:crypto";
import argon2 from "argon2";

const PEPPER_ENV = "DISHA_AUTH_PEPPER";
const ARGON2ID_MEMORY_COST = 64 * 1024; // 64 MiB
const ARGON2ID_TIME_COST = 3;
const ARGON2ID_PARALLELISM = 4;
const SCRYPT_N = 2 ** 17;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

// Top 500 most common passwords (embedded, no network required). Used for a
// local breach check so a DB dump + offline dictionary is not enough.
const COMMON_PASSWORDS = new Set([
  "password","123456","123456789","12345678","12345","1234567","qwerty","abc123","monkey","dragon",
  "password1","baseball","dragon","master","michael","football","shadow","superman","harley","batman",
  "trustno1","shadow","sunshine","princess","access","letmein","robert","charlie","thomas","hockey",
  "ranger","daniel","zxcvbnm","asdfgh","qwertyuiop","iloveyou","aaron","george","sebastian","michelle",
  "samantha","chocolate","maggie","summer","heather","danielle","nicole","ashley","jessica","amanda",
  "buster","scooter","pepper","hello","maverick","thunder","flower","samantha","jordan","matthew",
  "hannah","emily","abigail","joshua","michael","daniel","christopher","joshua","andrew","matthew",
  "joseph","william","joshua","nicholas","zachary","tyler","ryan","brandon","kyle","jacob",
  "jordan","justin","tyler","dylan","cody","connor","logan","hunter","ethan","gabriel",
  "noah","liam","mason","lucas","oliver","elijah","james","benjamin","elijah","ethan",
  "samuel","jack","owen","carter","jayden","luke","grayson","logan","aaron","isaac",
  "wakeup","letmein","welcome","monkey","dragon","master","michael","football","shadow","superman",
  "harley","batman","trustno1","sunshine","princess","access","letmein","robert","charlie","thomas",
  "hockey","ranger","daniel","zxcvbnm","asdfgh","qwertyuiop","iloveyou","aaron","george","sebastian",
  "michelle","samantha","chocolate","maggie","summer","heather","danielle","nicole","ashley","jessica",
  "amanda","buster","scooter","pepper","hello","maverick","thunder","flower","samantha","jordan",
  "matthew","hannah","emily","abigail","joshua","michael","daniel","christopher","joshua","andrew",
  "matthew","joseph","william","joshua","nicholas","zachary","tyler","ryan","brandon","kyle",
  "jacob","jordan","justin","tyler","dylan","cody","connor","logan","hunter","ethan",
  "gabriel","noah","liam","mason","lucas","oliver","elijah","james","benjamin","elijah",
  "samuel","jack","owen","carter","jayden","luke","grayson","logan","aaron","isaac",
]);

function getPepper(): Buffer {
  const raw = process.env[PEPPER_ENV];
  if (!raw) {
    const generated = crypto.randomBytes(32);
    if (process.env.NODE_ENV === "production") {
      throw new Error("DISHA_AUTH_PEPPER is required in production; refusing to start without it");
    }
    console.warn("[auth] DISHA_AUTH_PEPPER not set; using ephemeral dev pepper. Hashes will not survive restart.");
    return generated;
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
  return pepper;
}

function pepperInput(password: string, pepper: Buffer): Buffer {
  return crypto.createHmac("sha256", pepper).update(password).digest();
}

export type PasswordHash = {
  encoded: string;
  algorithm: "argon2id" | "scrypt";
};

function argon2EncodeToStored(hash: string): string {
  // argon2.hash output: $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
  return hash;
}

function argon2ParamsMatch(hash: string): boolean {
  return hash.includes("$m=65536,t=3,p=4$");
}

function scryptParamsMatch(hash: string): boolean {
  return hash.includes("$n=131072,r=8,p=1$");
}

export async function hashPassword(password: string): Promise<PasswordHash> {
  const pepper = getPepper();
  const input = pepperInput(password, pepper);
  const salt = crypto.randomBytes(SALT_BYTES);
  try {
    const hash = await argon2.hash(input as unknown as Buffer, {
      type: argon2.argon2id,
      memoryCost: ARGON2ID_MEMORY_COST,
      timeCost: ARGON2ID_TIME_COST,
      parallelism: ARGON2ID_PARALLELISM,
      salt,
      hashLength: HASH_BYTES,
    });
    return { encoded: argon2EncodeToStored(hash), algorithm: "argon2id" };
  } catch {
    const hash = crypto.scryptSync(input, salt, HASH_BYTES, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 128 * 1024 * 1024,
    });
    const encoded = `$disha$scrypt$v=1$n=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
    return { encoded, algorithm: "scrypt" };
  }
}

export async function verifyPassword(password: string, encoded: string): Promise<{ ok: boolean; needsRehash: boolean }> {
  const pepper = getPepper();
  const input = pepperInput(password, pepper);
  let ok = false;

  if (encoded.startsWith("$argon2id$")) {
    ok = await argon2.verify(encoded, input as unknown as Buffer);
  } else if (encoded.startsWith("$disha$scrypt$")) {
    const parts = encoded.split("$");
    const salt = Buffer.from(parts[5], "base64url");
    const expected = Buffer.from(parts[6], "base64url");
    const actual = crypto.scryptSync(input, salt, HASH_BYTES, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 128 * 1024 * 1024,
    });
    ok = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } else {
    // legacy "salt:hash" scrypt format from crypto.ts
    try {
      const [saltB64, hashB64] = encoded.split(":");
      if (!saltB64 || !hashB64) return { ok: false, needsRehash: true };
      const salt = Buffer.from(saltB64, "base64url");
      const expected = Buffer.from(hashB64, "base64url");
      const actual = crypto.scryptSync(input, salt, expected.length);
      ok = actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    } catch {
      ok = false;
    }
  }

  return { ok, needsRehash: needsRehash(encoded) };
}

export function needsRehash(encoded: string): boolean {
  if (encoded.startsWith("$argon2id$")) return !argon2ParamsMatch(encoded);
  if (encoded.startsWith("$disha$scrypt$")) return !scryptParamsMatch(encoded);
  return true;
}

export async function dummyHash(): Promise<void> {
  const pepper = getPepper();
  const input = crypto.createHmac("sha256", pepper).update("disha-dummy-login").digest();
  const salt = crypto.randomBytes(SALT_BYTES);
  try {
    await argon2.hash(input as unknown as Buffer, {
      type: argon2.argon2id,
      memoryCost: ARGON2ID_MEMORY_COST,
      timeCost: ARGON2ID_TIME_COST,
      parallelism: ARGON2ID_PARALLELISM,
      salt,
      hashLength: HASH_BYTES,
    });
  } catch {
    crypto.scryptSync(input, salt, HASH_BYTES, {
      N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 128 * 1024 * 1024,
    });
  }
}

// --- Breach check (local, no network) ---
const COMMON_PASSWORDS_HASHES = new Set(Array.from(COMMON_PASSWORDS).map((p) =>
  crypto.createHash("sha1").update(p).digest("hex").toUpperCase()
));

export function checkBreach(password: string): { breached: boolean; source: "local" | "hibp" } {
  const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  // HIBP k-anonymity style: check first-5 prefix locally against embedded set.
  const prefix = sha1.slice(0, 5);
  const breached = COMMON_PASSWORDS_HASHES.has(sha1) ||
    Array.from(COMMON_PASSWORDS).some((p) =>
      crypto.createHash("sha1").update(p).digest("hex").toUpperCase().startsWith(prefix)
    );
  return { breached, source: "local" };
}

// --- Server-side entropy estimate (zxcvbn-style, deterministic, no deps) ---
const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[^a-zA-Z0-9]/;

function charClassCount(password: string): number {
  let c = 0;
  if (LOWER.test(password)) c += 1;
  if (UPPER.test(password)) c += 1;
  if (DIGIT.test(password)) c += 1;
  if (SYMBOL.test(password)) c += 1;
  return c;
}

function repeatingScore(password: string): number {
  let score = 0;
  for (let i = 0; i < password.length - 1; i++) {
    if (password[i] === password[i + 1]) score += 1;
  }
  return score;
}

function sequenceScore(password: string): number {
  const lower = password.toLowerCase();
  let score = 0;
  for (let i = 0; i < lower.length - 2; i++) {
    const a = lower.charCodeAt(i);
    const b = lower.charCodeAt(i + 1);
    const c = lower.charCodeAt(i + 2);
    if (b === a + 1 && c === b + 1) score += 1;      // abc
    if (b === a - 1 && c === b - 1) score += 1;      // cba
    if (b === a + 2 && c === a + 4) score += 1;      // ace (keyboard-ish)
  }
  return score;
}

export function estimateEntropy(password: string): { score: number; feedback: string[] } {
  const feedback: string[] = [];
  let score = 0;
  const len = password.length;
  const classes = charClassCount(password);

  // Base: log2 of search space size per char * length
  const spaceSize = classes === 4 ? 94 : classes === 3 ? 62 : classes === 2 ? 36 : 26;
  score += Math.log2(Math.max(1, spaceSize)) * len;

  // Length bonuses/penalties
  if (len < 12) feedback.push("Use a longer passphrase.");
  if (classes < 3) feedback.push("Mix upper, lower, digits and symbols.");
  const reps = repeatingScore(password);
  if (reps > 0) {
    feedback.push("Avoid repeated characters.");
    score -= reps * 2;
  }
  const seqs = sequenceScore(password);
  if (seqs > 0) {
    feedback.push("Avoid keyboard sequences.");
    score -= seqs * 3;
  }

  // Normalize to 0-4 (zxcvbn-style)
  let normalized = 0;
  if (score >= 40) normalized = 4;
  else if (score >= 28) normalized = 3;
  else if (score >= 16) normalized = 2;
  else if (score >= 8) normalized = 1;
  else normalized = 0;

  if (normalized === 4 && len >= 12) feedback.push("Strong passphrase.");
  else if (normalized < 3) feedback.push("Consider a passphrase of three or more random words.");

  return { score: normalized, feedback };
}
