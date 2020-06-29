import { getRepository } from "typeorm";
import { singleton } from "tsyringe";
import speakeasy from "speakeasy";
import moment from "moment";

import { MfaEntity, MfaMethod } from "../dal/entities/mfaEntity";
import { MfaException } from "../exceptions/exceptions";
import { InvalidPasswordException } from "../exceptions/userExceptions";
import cryptoRandomString from "crypto-random-string";
import { MFA_LOGIN_TOKEN_LENGTH } from "../utils/globalConsts";
import { CacheDb } from "../dal/cacheDb";
import { Config } from "../utils/config/config";
import { TimeSpan } from "../utils/timeSpan";

const SECRET_ENCODING = "base32";

@singleton()
export class MfaManager {
    private _repo = getRepository(MfaEntity);
    private _mfaLoginTTL: TimeSpan;

    constructor(private _cache: CacheDb, config: Config) {
        if (!_cache) {
            throw new Error("Cache is required.");
        }
        this._mfaLoginTTL = TimeSpan.fromSeconds(config.security.mfa.loginTokenTTLSeconds);
        if (this._mfaLoginTTL.seconds <= 0) {
            throw new Error("MFA Login Token TTL has to be greater than 0 seconds.");
        }
    }

    public async getActiveMethod(userId: string): Promise<MfaMethod> {
        const entity = await this.getByUserId(userId);
        if (!entity || !entity.enabled) {
            return MfaMethod.none;
        }
        return entity.method;
    }

    public async generateTotp(userId: string, ip: string, name = "AppName"): Promise<string> {
        let entity = await this.getByUserId(userId);
        if (entity && entity.enabled) {
            throw new MfaException("Old MFA method is still active.");
        }
        const secret = speakeasy.generateSecret({ name: name });
        const secretString = secret[SECRET_ENCODING];
        if (!entity) {
            entity = new MfaEntity(userId, MfaMethod.totp, secretString, ip);
        } else {
            entity.secret = secretString;
            entity.ip = ip;
            entity.method = MfaMethod.totp;
            entity.createdAt = new Date();
        }
        await entity.save();

        return secret.otpauth_url;
    }

    public async enableTotp(userId: string, oneTimePass: string, ip: string) {
        const entity = await this.getByUserId(userId);
        if (!entity) {
            throw new MfaException("MFA process is not started.");
        }
        if (entity.enabled) {
            throw new MfaException("MFA is already enabled.");
        }

        if (!this.verifyTotpToken(entity.secret, oneTimePass)) {
            throw new InvalidPasswordException();
        }

        entity.enabled = true;
        entity.ip = ip;
        await entity.save();
    }

    public async verifyTotp(userId: string, oneTimePass: string): Promise<boolean> {
        const entity = await this.getByUserId(userId);
        if (!entity || !entity.enabled) {
            return false;
        }

        return this.verifyTotpToken(entity.secret, oneTimePass);
    }

    public async disableTotp(userId: string, oneTimePass: string) {
        const entity = await this.getByUserId(userId);
        if (!entity) {
            return;
        }

        if (!this.verifyTotpToken(entity.secret, oneTimePass)) {
            throw new InvalidPasswordException();
        }

        await this._repo.remove(entity);
    }

    public async issueLoginToken(userId: string, ip: string): Promise<{ token: string; expiresAt: number }> {
        const token = cryptoRandomString({ length: MFA_LOGIN_TOKEN_LENGTH, type: "hex" });
        await this._cache.setMfaLoginToken(userId, token, ip, this._mfaLoginTTL);
        const expiresAt = moment().add(this._mfaLoginTTL.seconds, "seconds").unix();

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

    private getByUserId(userId: string): Promise<MfaEntity> {
        return this._repo.findOne({ where: { userId: userId } });
    }

    private verifyTotpToken(secret: string, otp: string): boolean {
        return speakeasy.totp.verify({ secret: secret, encoding: SECRET_ENCODING, token: otp });
    }
}
