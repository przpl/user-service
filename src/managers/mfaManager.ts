import { getRepository } from "typeorm";
import { singleton } from "tsyringe";
import speakeasy from "speakeasy";

import { MfaEntity, MfaMethod } from "../dal/entities/mfaEntity";
import { MfaException } from "../exceptions/exceptions";
import { MfaService } from "../services/mfaService";
import { InvalidPasswordException } from "../exceptions/userExceptions";

const SECRET_ENCODING = "base32";

@singleton()
export class MfaManager {
    private _repo = getRepository(MfaEntity);

    constructor(private _mfaService: MfaService) {}

    public async getActiveMethod(userId: string): Promise<MfaMethod> {
        const entity = await this._repo.findOne({ where: { userId: userId } });
        if (!entity || !entity.enabled) {
            return MfaMethod.none;
        }
        return entity.method;
    }

    public async issueHotpOtpAuth(userId: string, method: MfaMethod, ip: string, name = "AppName"): Promise<string> {
        let entity = await this._repo.findOne({ where: { userId: userId } });
        if (entity && entity.enabled) {
            throw new MfaException("Old MFA method is still active.");
        }
        const secret = speakeasy.generateSecret({ name: name });
        const secretString = secret[SECRET_ENCODING];
        if (!entity) {
            entity = new MfaEntity(userId, method, secretString, ip);
        } else {
            entity.secret = secretString;
            entity.ip = ip;
            entity.createdAt = new Date();
        }
        await entity.save();

        return secret.otpauth_url;
    }

    public async enableHtopFa(userId: string, oneTimePassword: string, ip: string) {
        const entity = await this._repo.findOne({ where: { userId: userId } });
        if (!entity) {
            throw new Error("MFA process is not started.");
        }
        if (entity.enabled) {
            throw new Error("MFA is already enabled.");
        }

        if (!this.verifyOtp(entity.secret, oneTimePassword)) {
            throw new InvalidPasswordException();
        }

        entity.enabled = true;
        entity.ip = ip;
        await entity.save();
    }

    public async verifyHtop(userId: string, oneTimePassword: string): Promise<boolean> {
        const entity = await this._repo.findOne({ where: { userId: userId } });
        if (!entity || !entity.enabled) {
            return false;
        }

        return this.verifyOtp(entity.secret, oneTimePassword);
    }

    public async disableHtopFa(userId: string, oneTimePassword: string) {
        const entity = await this._repo.findOne({ where: { userId: userId } });
        if (!entity) {
            return;
        }

        if (!this.verifyOtp(entity.secret, oneTimePassword)) {
            throw new InvalidPasswordException();
        }

        await this._repo.remove(entity);
    }

    private verifyOtp(secret: string, otp: string): boolean {
        return speakeasy.totp.verify({ secret: secret, encoding: SECRET_ENCODING, token: otp });
    }
}
