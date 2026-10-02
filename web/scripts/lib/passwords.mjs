import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const parameters = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
let active = 0;

async function derive(password, salt) {
  // Bound memory use as well as request rate. Each derivation uses about 128 MiB.
  if (active >= 2) throw Object.assign(new Error("Sign-in is busy. Please try again."), { status: 503 });
  active++;
  try {
    return await new Promise((resolve, reject) => {
      scrypt(password, salt, 64, parameters, (error, key) => error ? reject(error) : resolve(key));
    });
  } finally { active--; }
}

export function validatePassword(password) {
  if (typeof password !== "string" || password.length < 15 || password.length > 256) {
    throw Object.assign(new Error("Use a password or passphrase with 15 to 256 characters."), { status: 400 });
  }
}

export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return ["scrypt", "131072", "8", "1", salt.toString("hex"), key.toString("hex")].join("$");
}

export async function verifyPassword(password, encoded) {
  const parts = typeof encoded === "string" ? encoded.split("$") : [];
  const valid = parts.length === 6 && parts.slice(0, 4).join("$") === "scrypt$131072$8$1" &&
    /^[a-f0-9]{32}$/.test(parts[4]) && /^[a-f0-9]{128}$/.test(parts[5]);
  // Missing accounts take the same expensive path; no reusable default password exists.
  const salt = valid ? Buffer.from(parts[4], "hex") : Buffer.alloc(16);
  const expected = valid ? Buffer.from(parts[5], "hex") : Buffer.alloc(64);
  const key = await derive(password, salt);
  return timingSafeEqual(key, expected) && valid;
}
