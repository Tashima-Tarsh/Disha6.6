import { createClient, type RedisClientType } from "redis";
import { getEnv } from "./env";

let clientPromise: Promise<RedisClientType> | null | undefined;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (clientPromise !== undefined) return clientPromise;
  const { REDIS_URL } = getEnv();
  if (!REDIS_URL) {
    clientPromise = null;
    return null;
  }
  const client = createClient({ url: REDIS_URL, socket: { connectTimeout: 4000, reconnectStrategy: false } });
  client.on("error", () => console.error(JSON.stringify({ type: "redis_error", message: "Temporary storage connection failed" })));
  clientPromise = client.connect().then(() => client as RedisClientType).catch((error: unknown) => { clientPromise = undefined; throw error; });
  return clientPromise;
}
