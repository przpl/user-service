import { inject, singleton } from "tsyringe";

import { MfaLoginToken } from "../models/mfaLoginToken";
import { RedisClient } from "../types/redisClient";
import nameof from "../utils/nameof";
import { TimeSpan } from "../utils/timeSpan";

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
    constructor(@inject("redisClient") private _client: RedisClient) {}

    public async setMfaLoginToken(userId: string, token: string, ip: string, expireTime: TimeSpan): Promise<boolean> {
        const key = this.getMfaLoginTokenKey(userId);
        return await this.setHashWithExpiration(key, expireTime, {
            [nameof<MfaLoginToken>("token")]: token,
            [nameof<MfaLoginToken>("ip")]: ip,
        });
    }

    public async getMfaLoginToken(userId: string): Promise<MfaLoginToken> {
        const keyName = this.getMfaLoginTokenKey(userId);
        const result = await this._client.hGetAll(keyName);
        const token = new MfaLoginToken();
        token.token = result[nameof<MfaLoginToken>("token")];
        token.ip = result[nameof<MfaLoginToken>("ip")];
        return token;
    }

    public async removeMfaLoginToken(userId: string): Promise<number> {
        const key = this.getMfaLoginTokenKey(userId);
        return await this._client.del(key);
    }

    public async revokeAccessToken(userId: string, ref: string, expireTime: TimeSpan): Promise<boolean> {
        const key = this.getRevokeAccessTokenKey(userId, ref);
        return await this.setHashWithExpiration(key, expireTime, { [FIELD_USED_BY_ASP_NET]: "1" });
    }

    public async isAccessTokenRevoked(userId: string, ref: string): Promise<boolean> {
        const key = this.getRevokeAccessTokenKey(userId, ref);
        return (await this._client.exists(key)) > 0;
    }

    public async setSession(cookie: string, userId: string, expireTime: TimeSpan): Promise<boolean> {
        const key = this.getSessionKey(cookie);
        return await this.setWithExpiration(key, userId, expireTime);
    }

    public async getSession(cookie: string): Promise<string> {
        const key = this.getSessionKey(cookie);
        return await this._client.get(key);
    }

    public async removeSession(session: string): Promise<number> {
        const key = this.getSessionKey(session);
        return await this._client.del(key);
    }

    private async setWithExpiration(key: string, value: string, duration: TimeSpan): Promise<boolean> {
        return (await this._client.set(key, value, { EX: duration.seconds })) === "OK";
    }

    private async setHashWithExpiration(key: string, duration: TimeSpan, keyValueMap: Record<string, string>): Promise<boolean> {
        const result = await this._client.hSet(key, keyValueMap);
        if (!result) {
            return false;
        }
        return await this._client.expire(key, duration.seconds);
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
