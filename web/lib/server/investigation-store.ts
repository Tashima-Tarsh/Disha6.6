import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getRedisClient } from "./redis";
import type { Investigation } from "../investigation/types";

export interface TemporaryInvestigation extends Investigation { ownerId: string }
export interface InvestigationStore {
  create(value: TemporaryInvestigation, image?: Buffer): Promise<void>;
  authorized(id: string, owner: string): Promise<boolean>;
  read(id: string): Promise<TemporaryInvestigation | null>;
  save(value: TemporaryInvestigation): Promise<boolean>;
  image(id: string): Promise<Buffer | null>;
  acquire(id: string): Promise<string | null>;
  release(id: string, token: string): Promise<void>;
  busy(id: string): Promise<boolean>;
  stop(id: string): Promise<void>;
  stopped(id: string): Promise<boolean>;
  remove(id: string): Promise<void>;
  budget(owner: string, limit: number): Promise<boolean>;
}
const ownerHash = (owner: string) => createHash("sha256").update(owner).digest("hex");
const prefix = (id: string) => `disha:ephemeral:{${id}}`;
function encryptionKey(): Buffer {
  const secret = process.env.DISHA_INVESTIGATION_KEY ?? process.env.DISHA_JWT_SECRET;
  if (!secret || secret.length < 32) throw Object.assign(new Error("Temporary investigation encryption is not configured"), { status: 503 });
  return createHash("sha256").update("disha-investigation-v1\0").update(secret).digest();
}
export function sealTemporary(value: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}
export function openTemporary(value: string): Buffer {
  const body = Buffer.from(value, "base64");
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), body.subarray(0, 12));
  cipher.setAuthTag(body.subarray(12, 28));
  return Buffer.concat([cipher.update(body.subarray(28)), cipher.final()]);
}
async function redisRequired() {
  const redis = await getRedisClient();
  if (!redis) throw Object.assign(new Error("Temporary investigation store requires REDIS_URL"), { status: 503 });
  return redis;
}
export const investigationStore: InvestigationStore = {
  async create(value, image) {
    const redis = await redisRequired();
    const ttl = Math.max(1, new Date(value.expiresAt).getTime() - Date.now());
    const key = prefix(value.investigationId);
    const tx = redis.multi().set(`${key}:state`, sealTemporary(Buffer.from(JSON.stringify(value))), { PX: ttl });
    tx.set(`${key}:owner`, ownerHash(value.ownerId), { PX: ttl + 15 * 60_000 });
    if (image) tx.set(`${key}:image`, sealTemporary(image), { PX: ttl });
    await tx.exec();
  },
  async authorized(id, owner) {
    const stored = await (await redisRequired()).get(`${prefix(id)}:owner`);
    if (!stored) return false;
    const computed = ownerHash(owner);
    const bufA = Buffer.from(stored);
    const bufB = Buffer.from(computed);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  },
  async read(id) {
    const value = await (await redisRequired()).get(`${prefix(id)}:state`);
    return value ? JSON.parse(openTemporary(value).toString("utf8")) as TemporaryInvestigation : null;
  },
  async save(value) {
    const key = prefix(value.investigationId);
    const ttl = new Date(value.expiresAt).getTime() - Date.now();
    if (ttl <= 0) return false;
    // Atomic fencing prevents a late adapter result from recreating closed data.
    const result = await (await redisRequired()).eval(
      "if redis.call('exists',KEYS[1]) == 0 or redis.call('exists',KEYS[2]) == 1 then return 0 end; redis.call('psetex',KEYS[1],ARGV[1],ARGV[2]); return 1",
      { keys: [`${key}:state`, `${key}:stop`], arguments: [String(ttl), sealTemporary(Buffer.from(JSON.stringify(value)))] },
    );
    return result === 1;
  },
  async image(id) {
    const value = await (await redisRequired()).get(`${prefix(id)}:image`);
    return value ? openTemporary(value) : null;
  },
  async acquire(id) {
    const token = randomUUID();
    const key = prefix(id);
    const result = await (await redisRequired()).eval(
      "if redis.call('exists',KEYS[1]) == 0 or redis.call('exists',KEYS[2]) == 1 then return 0 end; if redis.call('set',KEYS[3],ARGV[1],'PX',30000,'NX') then return 1 end; return 0",
      { keys: [`${key}:state`, `${key}:stop`, `${key}:lease`], arguments: [token] },
    );
    return result === 1 ? token : null;
  },
  async release(id, token) {
    await (await redisRequired()).eval("if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) end; return 0", { keys: [`${prefix(id)}:lease`], arguments: [token] });
  },
  async busy(id) { return (await (await redisRequired()).exists(`${prefix(id)}:lease`)) === 1; },
  async stop(id) { await (await redisRequired()).set(`${prefix(id)}:stop`, "1", { EX: 1800 }); },
  async stopped(id) { return (await (await redisRequired()).exists(`${prefix(id)}:stop`)) === 1; },
  async remove(id) { await (await redisRequired()).del([`${prefix(id)}:state`, `${prefix(id)}:image`]); },
  async budget(owner, limit) {
    const redis = await redisRequired();
    const key = `disha:investigation-budget:${createHash("sha256").update(owner).digest("hex")}`;
    const count = await redis.eval("local n=redis.call('incr',KEYS[1]); if n==1 then redis.call('expire',KEYS[1],60) end; return n", { keys: [key], arguments: [] });
    return Number(count) <= limit;
  },
};
