import redis from "redis";
import { singleton } from "tsyringe";

import { TimeSpan } from "../utils/timeSpan";
import { Config } from "../utils/config/config";
import { MfaLoginToken } from "../models/mfaLoginToken";

enum KeyFlag {
    expireSeconds = "EX",
    expireMiliseconds = "PX",
    onlySetIfNotExist = "NX",
    onlySetIfExist = "XX",
}

enum KeyName {
    mfaLoginToken = "mlt",
    revokeAccessToken = "rve",
}

@singleton()
export class CacheDb {
    private _client: redis.RedisClient;

    constructor(config: Config) {
        const host = config.redis.host || "127.0.0.1";
        const port = config.redis.port || 6379;
        this._client = redis.createClient({ host: host, port: port });
    }

    public setMfaLoginToken(userId: string, token: string, ip: string, expireTime: TimeSpan) {
        const keyName = this.getMfaLoginTokenKey(userId);
        const tokenObj: MfaLoginToken = { token: token, ip: ip };
        return this.set(keyName, JSON.stringify(tokenObj), KeyFlag.expireSeconds, expireTime.seconds);
    }

    public getMfaLoginToken(userId: string): Promise<MfaLoginToken> {
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

    public removeMfaLoginToken(userId: string): Promise<number> {
        return new Promise((resolve, reject) => {
            const keyName = this.getMfaLoginTokenKey(userId);
            this._client.del(keyName, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(reply);
            });
        });
    }

    public revokeAccessToken(userId: string, ref: string, expireTime: TimeSpan): Promise<boolean> {
        const keyName = this.getRevokeAccessTokenKey(userId, ref);
        return this.set(keyName, "", KeyFlag.expireSeconds, expireTime.seconds);
    }

    public isAccessTokenRevoked(userId: string, ref: string, cb: (err: Error, reply: number) => void) {
        const keyName = this.getRevokeAccessTokenKey(userId, ref);
        this._client.EXISTS(keyName, cb);
    }

    private set(key: string, value: string, mode: string, duration: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this._client.SET(key, value, mode, duration, (err, reply) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(reply === "OK");
            });
        });
    }

    private getMfaLoginTokenKey(userId: string): string {
        return `${KeyName.mfaLoginToken}:${userId}`;
    }

    private getRevokeAccessTokenKey(userId: string, ref: string): string {
        return `${KeyName.revokeAccessToken}:${userId}:${ref}`;
    }
}
