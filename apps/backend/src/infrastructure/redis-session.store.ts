import type { RedisClientType } from "redis";
import type { Session } from "@fastify/session";

type SessionRecord = Session & { [key: string]: unknown };

export class RedisSessionStore {
  constructor(
    private readonly client: RedisClientType,
    private readonly prefix = "utoolity:session:",
  ) {}

  get(id: string, callback: (error: Error | null, value?: SessionRecord | null) => void): void {
    void this.client.get(this.prefix + id)
      .then((value) => callback(null, value ? JSON.parse(value) as SessionRecord : null))
      .catch((error: Error) => callback(error));
  }

  set(id: string, value: SessionRecord, callback: (error?: Error) => void): void {
    const expiresAt = value.cookie?.expires?.getTime();
    const ttl = Math.max(
      1,
      Math.ceil(((expiresAt ?? Date.now() + 8 * 60 * 60 * 1000) - Date.now()) / 1000),
    );
    void this.client.set(this.prefix + id, JSON.stringify(value), { EX: ttl })
      .then(() => callback())
      .catch((error: Error) => callback(error));
  }

  destroy(id: string, callback: (error?: Error) => void): void {
    void this.client.del(this.prefix + id)
      .then(() => callback())
      .catch((error: Error) => callback(error));
  }
}
