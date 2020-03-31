import cryptoRandomString from "crypto-random-string";
import { singleton } from "tsyringe";

import { CacheDb } from "../dal/cacheDb";
import { unixTimestampS } from "../utils/timeUtils";
import { TimeSpan } from "../utils/timeSpan";
import { MFA_LOGIN_TOKEN_LENGHT } from "../utils/globalConsts";
import { Config } from "../utils/config/config";

// TODO merge with MfaManager
@singleton()
export class MfaService {
    private _mfaLoginTTL: TimeSpan;

    constructor(private _cache: CacheDb, config: Config) {
        if (!_cache) {
            throw new Error("Cache is required.");
        }
        this._mfaLoginTTL = TimeSpan.fromSeconds(config.security.mfa.loginTokenTTLSeconds)
        if (this._mfaLoginTTL.seconds <= 0) {
            throw new Error("MFA Login Token TTL has to be greater than 0 seconds.");
        }
    }

    public async issueLoginToken(userId: string, ip: string): Promise<{ token: string; expiresAt: number }> {
        const token = cryptoRandomString({ length: MFA_LOGIN_TOKEN_LENGHT, type: "hex" });
        await this._cache.setMfaLoginToken(userId, token, ip, this._mfaLoginTTL);
        const expiresAt = unixTimestampS() + this._mfaLoginTTL.seconds;
        return { token: token, expiresAt: expiresAt };
    }

    public async verifyLoginToken(userId: string, token: string, ip: string): Promise<boolean> {
        const twoFaToken = await this._cache.getMfaLoginToken(userId);
        if (!twoFaToken) {
            return false;
        }

        return twoFaToken.token === token && twoFaToken.ip === ip;
    }

    public async revokeLoginToken(userId: string) {
        await this._cache.removeMfaLoginToken(userId);
    }
}
