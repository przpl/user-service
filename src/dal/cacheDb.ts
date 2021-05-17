import redis from "redis";
import { singleton } from "tsyringe";

import { MfaLoginToken } from "../models/mfaLoginToken";
import { Config } from "../utils/config/config";
import nameof from "../utils/nameof";
import { TimeSpan } from "../utils/timeSpan";

enum KeyFlag {
    expireSeconds = "EX",
    expireMilliseconds = "PX",
    onlySetIfNotExist = "NX",
    onlySetIfExist = "XX",
}

enum KeyName {
    mfaLoginToken = "mlt",
    revokeAccessToken = "rve",
    cachedSession = "cs",
}

export interface CachedSessions {
    id: string;
    ts: number;
}

const FIELD_USED_BY_ASP_NET = "data";

@singleton()
export class CacheDb {
    private _client: redis.RedisClient;

    constructor(config: Config) {
        const host = config.redis.host || "127.0.0.1";
        const port = config.redis.port || 6379;
        this._client = redis.createClient({ host: host, port: port });
    }

    public async setMfaLoginToken(userId: string, token: string, ip: string, expireTime: TimeSpan): Promise<boolean> {
        const key = this.getMfaLoginTokenKey(userId);
        return this.setHashWithExpiration(key, expireTime, nameof<MfaLoginToken>("token"), token, nameof<MfaLoginToken>("ip"), ip);
    }

    public async getMfaLoginToken(userId: string): Promise<MfaLoginToken> {
        return new Promise((resolve, reject) => {
            const keyName = this.getMfaLoginTokenKey(userId);
            this._client.HGETALL(keyName, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                const result = new MfaLoginToken();
                result.token = reply[nameof<MfaLoginToken>("token")];
                result.ip = reply[nameof<MfaLoginToken>("ip")];
                resolve(result);
            });
        });
    }

    public async removeMfaLoginToken(userId: string): Promise<number> {
        const key = this.getMfaLoginTokenKey(userId);
        return this.delete(key);
    }

    public async revokeAccessToken(userId: string, ref: string, expireTime: TimeSpan): Promise<boolean> {
        const key = this.getRevokeAccessTokenKey(userId, ref);
        return this.setHashWithExpiration(key, expireTime, FIELD_USED_BY_ASP_NET, "1");
    }

    public isAccessTokenRevoked(userId: string, ref: string, cb: (err: Error, reply: number) => void): void {
        const key = this.getRevokeAccessTokenKey(userId, ref);
        this._client.EXISTS(key, cb);
    }

    public async setCachedSessions(userId: string, sessions: CachedSessions[]) {
        const keyName = this.getCachedSessionsKey(userId);
        return this.set(keyName, JSON.stringify(sessions));
    }

    public async getCachedSessions(userId: string): Promise<CachedSessions[]> {
        return new Promise((resolve, reject) => {
            const keyName = this.getCachedSessionsKey(userId);
            this._client.GET(keyName, (err, reply) => {
                if (err) {
                    return reject(err);
                }
                const sessions = JSON.parse(reply);
                if (!sessions) {
                    return resolve([]);
                }
                resolve(sessions);
            });
        });
    }

    public async deleteCachedSessions(userId: string): Promise<boolean> {
        const key = this.getCachedSessionsKey(userId);
        return (await this.delete(key)) > 0;
    }

    private delete(key: string): Promise<number> {
        return new Promise((resolve, reject) => {
            this._client.del(key, (err, reply) => {
                if (err) {
                    return reject(err);
                }
                resolve(reply);
            });
        });
    }

    private set(key: string, value: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this._client.SET(key, value, (err, reply) => {
                if (err) {
                    return reject(err);
                }
                resolve(reply === "OK");
            });
        });
    }

    private setWithExpiration(key: string, value: string, duration: TimeSpan): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this._client.SET(key, value, KeyFlag.expireSeconds, duration.seconds, (err, reply) => {
                if (err) {
                    return reject(err);
                }
                resolve(reply === "OK");
            });
        });
    }

    private setHashWithExpiration(key: string, duration: TimeSpan, ...args: string[]): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this._client.HSET(key, ...args, (err, reply) => {
                if (err) {
                    return reject(err);
                }
                if (!reply) {
                    return resolve(false);
                }
                this._client.EXPIRE(key, duration.seconds, (expireErr, expireReply) => {
                    if (expireErr) {
                        return reject(err);
                    }
                    resolve(expireReply > 0);
                });
            });
        });
    }

    private getCachedSessionsKey(userId: string): string {
        return `${KeyName.cachedSession}:${userId}`;
    }

    private getMfaLoginTokenKey(userId: string): string {
        return `${KeyName.mfaLoginToken}:${userId}`;
    }

    private getRevokeAccessTokenKey(userId: string, ref: string): string {
        return `${KeyName.revokeAccessToken}:${userId}:${ref}`;
    }
}
