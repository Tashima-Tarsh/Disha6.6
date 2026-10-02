import { createClient, type RedisClientType } from "redis";
import { getEnv } from "./env";
let clientPromise: Promise<RedisClientType> | null | undefined;
export async function getRedisClient(): Promise<RedisClientType | null> {
  if (clientPromise !== undefined) return clientPromise;
  const { REDIS_URL } = getEnv();
  if (!REDIS_URL) return null;
  const client = createClient({ url: REDIS_URL, socket: { connectTimeout: 2500, reconnectStrategy: false } });
  client.on("error", () => { console.error(JSON.stringify({ type: "redis", status: "unavailable" })); clientPromise = undefined; });
  clientPromise = (client.connect() as Promise<RedisClientType>).catch((error: unknown) => { clientPromise = undefined; throw error; });
  return clientPromise;
}
