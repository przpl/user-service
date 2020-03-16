import speakeasy from "speakeasy";
import { getRepository } from "typeorm";

import { CryptoService } from "./cryptoService";
import { CacheDb } from "../dal/cacheDb";
import { UserEntity, TwoFaMethod } from "../dal/entities/userEntity";

// TODO rename to UserManager
export class TwoFaService {
    private _userRepo = getRepository(UserEntity);

    constructor(private _cache: CacheDb, private _cryptoService: CryptoService) {
        if (!_cache) {
            throw new Error("Cache is required.");
        }
        if (!_cryptoService) {
            throw new Error("Crypto service is required.");
        }
    }

    public async issueLoginToken(userId: string, ip: string, ttlSeconds: number): Promise<string> {
        const token = this._cryptoService.randomHex(64);
        await this._cache.setTwoFaToken(userId, token, ip, ttlSeconds);
        return token;
    }

    public async verifyLoginToken(userId: string, token: string, ip: string): Promise<boolean> {
        const twoFaToken = await this._cache.getTwoFaToken(userId);
        if (!twoFaToken) {
            return false;
        }

        return twoFaToken.token === token && twoFaToken.ip === ip;
    }

    public async revokeLoginToken(userId: string) {
        await this._cache.removeTwoFaToken(userId);
    }

    public async issueHotpOtpAuth(userId: string): Promise<string> {
        const secret = speakeasy.generateSecret();
        const user = await this._userRepo.findOne({ id: userId });
        user.twoFaSecret = secret.base32;
        await user.save();
        return secret.otpauth_url;
    }

    public async verifyHtop(userId: string, oneTimePassword: string): Promise<boolean> {
        const user = await this._userRepo.findOne({ id: userId });
        if (user.twoFaMethod === TwoFaMethod.none) {
            return false;
        }
        return speakeasy.totp.verify({ secret: user.twoFaSecret, encoding: "base32", token: oneTimePassword });
    }
}
