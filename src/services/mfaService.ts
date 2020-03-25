import speakeasy from "speakeasy";
import { getRepository } from "typeorm";
import cryptoRandomString from "crypto-random-string";

import { CacheDb } from "../dal/cacheDb";
import { UserEntity, MfaMethod } from "../dal/entities/userEntity";
import { unixTimestampS } from "../utils/timeUtils";
import { TimeSpan } from "../utils/timeSpan";
import { MFA_LOGIN_TOKEN_LENGHT } from "../utils/globalConsts";

// TODO rename to MfaManager
export class MfaService {
    private _userRepo = getRepository(UserEntity);

    constructor(private _cache: CacheDb, private _mfaLoginTTL: TimeSpan) {
        if (!_cache) {
            throw new Error("Cache is required.");
        }
        if (_mfaLoginTTL.seconds <= 0) {
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

    public async issueHotpOtpAuth(userId: string, name = "AppName"): Promise<string> {
        const secret = speakeasy.generateSecret({ name: name });
        const user = await this._userRepo.findOne({ id: userId });
        user.mfaSecret = secret.base32;
        await user.save();
        return secret.otpauth_url;
    }

    public async verifyHtop(userId: string, oneTimePassword: string): Promise<boolean> {
        const user = await this._userRepo.findOne({ id: userId });
        if (user.mfaMethod === MfaMethod.none) {
            return false;
        }
        return speakeasy.totp.verify({ secret: user.mfaSecret, encoding: "base32", token: oneTimePassword });
    }
}
