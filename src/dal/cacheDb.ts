import redis from "redis";
import { singleton } from "tsyringe";

import { TimeSpan } from "../utils/timeSpan";
import { Config } from "../utils/config/config";
import { MfaLoginToken } from "../models/mfaLoginToken";

enum KeyFlag {
    expireSeconds = "EX",
    expireMilliseconds = "PX",
    onlySetIfNotExist = "NX",
    onlySetIfExist = "XX",
}

enum KeyName {
    mfaLoginToken = "mlt",
    revokeAccessToken = "rve",
    activeSessions = "avs",
}

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
        const tokenObj: MfaLoginToken = { token: token, ip: ip };
        return this.setWithExpiration(key, JSON.stringify(tokenObj), KeyFlag.expireSeconds, expireTime);
    }

    public async getMfaLoginToken(userId: string): Promise<MfaLoginToken> {
        return new Promise((resolve, reject) => {
            const keyName = this.getMfaLoginTokenKey(userId);
            this._client.GET(keyName, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                const token = JSON.parse(reply) as MfaLoginToken;
                resolve(token);
            });
        });
    }

    public async removeMfaLoginToken(userId: string): Promise<number> {
        const key = this.getMfaLoginTokenKey(userId);
        return this.delete(key);
    }

    public async revokeAccessToken(userId: string, ref: string, expireTime: TimeSpan): Promise<boolean> {
        const key = this.getRevokeAccessTokenKey(userId, ref);
        return this.setWithExpiration(key, "", KeyFlag.expireSeconds, expireTime);
    }

    public isAccessTokenRevoked(userId: string, ref: string, cb: (err: Error, reply: number) => void): void {
        const key = this.getRevokeAccessTokenKey(userId, ref);
        this._client.EXISTS(key, cb);
    }

    public async decrementActiveSessions(userId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const keyName = this.getActiveSessionsKey(userId);
            this._client.decr(keyName, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    public async getActiveSessions(userId: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const keyName = this.getActiveSessionsKey(userId);
            this._client.GET(keyName, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(+reply);
            });
        });
    }

    public async setActiveSessions(userId: string, value: number): Promise<boolean> {
        const key = this.getActiveSessionsKey(userId);
        return this.set(key, value.toString());
    }

    public async deleteActiveSessions(userId: string): Promise<boolean> {
        const key = this.getActiveSessionsKey(userId);
        return (await this.delete(key)) > 0;
    }

    private delete(key: string): Promise<number> {
        return new Promise((resolve, reject) => {
            this._client.del(key, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(reply);
            });
        });
    }

    private set(key: string, value: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this._client.SET(key, value, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(reply === "OK");
            });
        });
    }

    private setWithExpiration(key: string, value: string, mode: string, duration: TimeSpan): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this._client.SET(key, value, mode, duration.seconds, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(reply === "OK");
            });
        });
    }

    private getActiveSessionsKey(userId: string): string {
        return `${KeyName.activeSessions}:${userId}`;
    }

    private getMfaLoginTokenKey(userId: string): string {
        return `${KeyName.mfaLoginToken}:${userId}`;
    }

    private getRevokeAccessTokenKey(userId: string, ref: string): string {
        return `${KeyName.revokeAccessToken}:${userId}:${ref}`;
    }
}
