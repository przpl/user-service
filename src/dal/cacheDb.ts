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
    session = "sn",
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
        return await this.setHashWithExpiration(key, expireTime, nameof<MfaLoginToken>("token"), token, nameof<MfaLoginToken>("ip"), ip);
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
        return await this.delete(key);
    }

    public async revokeAccessToken(userId: string, ref: string, expireTime: TimeSpan): Promise<boolean> {
        const key = this.getRevokeAccessTokenKey(userId, ref);
        return await this.setHashWithExpiration(key, expireTime, FIELD_USED_BY_ASP_NET, "1");
    }

    public isAccessTokenRevoked(userId: string, ref: string, cb: (err: Error, reply: number) => void): void {
        const key = this.getRevokeAccessTokenKey(userId, ref);
        this._client.EXISTS(key, cb);
    }

    public async setSession(cookie: string, userId: string, expireTime: TimeSpan): Promise<boolean> {
        const key = this.getSessionKey(cookie);
        return await this.setWithExpiration(key, userId, expireTime);
    }

    public async getSession(cookie: string): Promise<string> {
        const key = this.getSessionKey(cookie);
        return await this.get(key);
    }

    public async removeSession(session: string): Promise<number> {
        const key = this.getSessionKey(session);
        return await this.delete(key);
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

    private get(key: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this._client.GET(key, (err, reply) => {
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

    private getSessionKey(cookie: string): string {
        return `${KeyName.session}:${cookie}`;
    }

    private getMfaLoginTokenKey(userId: string): string {
        return `${KeyName.mfaLoginToken}:${userId}`;
    }

    private getRevokeAccessTokenKey(userId: string, ref: string): string {
        return `${KeyName.revokeAccessToken}:${userId}:${ref}`;
    }
}
