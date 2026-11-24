import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client instance.
 * Automatically loads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from the environment.
 */
export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL || "https://placeholder.upstash.io",
        token: process.env.UPSTASH_REDIS_REST_TOKEN || "placeholder",
      });

export default redis;
