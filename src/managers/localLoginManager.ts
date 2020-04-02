import { getRepository, FindConditions } from "typeorm";
import { singleton } from "tsyringe";
import moment from "moment";

import { LocalLoginEntity } from "../dal/entities/localLoginEntity";
import { Credentials, PrimaryLoginType } from "../models/credentials";
import { PasswordService } from "../services/passwordService";
import { NotFoundException, InvalidPasswordException, UserNotLocalException } from "../exceptions/userExceptions";
import { Config } from "../utils/config/config";
import { TimeSpan } from "../utils/timeSpan";
import cryptoRandomString from "crypto-random-string";
import { EMAIL_CODE_LENGTH, PASSWORD_RESET_CODE_LENGTH } from "../utils/globalConsts";
import { EmailConfirmEntity } from "../dal/entities/emailConfirmEntity";
import { EmailResendCodeLimitException, EmailResendCodeTimeLimitException, ExpiredResetCodeException } from "../exceptions/exceptions";
import { PasswordResetEntity, PasswordResetMethod } from "../dal/entities/passwordResetEntity";
import { LocalLogin } from "../models/localLogin";
import { Phone } from "../models/phone";
import { PasswordReset } from "../models/passwordReset";

export enum LoginDuplicateType {
    none,
    email,
    username,
    phone,
}

export enum LoginResult {
    success,
    emailNotConfirmed,
    userNotFound,
    invalidPassword,
}

export class LoginOperationResult {
    result: LoginResult;
    login: LocalLoginEntity;
}

@singleton()
export class LocalLoginManager {
    private _loginRepo = getRepository(LocalLoginEntity);
    private _emailConfirmRepo = getRepository(EmailConfirmEntity);
    private _passResetRepo = getRepository(PasswordResetEntity);
    private _resendCountLimit: number;
    private _resendTimeLimit: TimeSpan;
    private _passResetCodeTTL: TimeSpan;

    constructor(private _passService: PasswordService, private _config: Config) {
        this._resendCountLimit = _config.localLogin.email.resendLimit;
        this._resendTimeLimit = TimeSpan.fromSeconds(_config.localLogin.email.resendTimeLimitSeconds);
        this._passResetCodeTTL = TimeSpan.fromMinutes(_config.passwordReset.codeTTLMinutes);
        if (this._passResetCodeTTL.seconds < TimeSpan.fromMinutes(5).seconds) {
            throw new Error("Password reset code expiration time has to be greater than 5 minutes.");
        }
    }

    public async isDuplicate(credentials: Credentials): Promise<LoginDuplicateType> {
        const entity = await this._loginRepo.findOne({ where: this.findByConditions(credentials) });
        if (!entity) {
            return LoginDuplicateType.none;
        }
        if (entity.email === credentials.email) {
            return LoginDuplicateType.email;
        }
        if (entity.username === credentials.username) {
            return LoginDuplicateType.username;
        }
        if (entity.email === credentials.email) {
            return LoginDuplicateType.phone;
        }
        throw new Error("Unable to find local login duplicate.");
    }

    public async create(credentials: Credentials, userId: string, password: string): Promise<LocalLogin> {
        const entity = new LocalLoginEntity();
        entity.userId = userId;
        entity.email = credentials.email;
        entity.username = credentials.username;
        entity.phoneCode = credentials.phone.code;
        entity.phoneNumber = credentials.phone.number;
        entity.passwordHash = await this._passService.hash(password);
        await entity.save();

        return this.toLocalLoginModel(entity);
    }

    public async authenticate(credentials: Credentials, password: string): Promise<LoginOperationResult> {
        const entity = await this._loginRepo.findOne({ where: this.findByPrimaryConditions(credentials) });
        if (!entity) {
            await this._passService.hash(password); // ? prevents time attack
            return { result: LoginResult.userNotFound, login: null };
        }

        const isPasswordMatch = await this._passService.verify(password, entity.passwordHash);
        if (!isPasswordMatch) {
            return { result: LoginResult.invalidPassword, login: entity };
        }

        if (this._config.localLogin.email.allowLogin && !this._config.localLogin.allowLoginWithoutConfirmedEmail && !entity.emailConfirmed) {
            return { result: LoginResult.emailNotConfirmed, login: entity };
        }

        return { result: LoginResult.success, login: entity };
    }

    public async isLocal(userId: string): Promise<boolean> {
        const entity = await this._loginRepo.findOne({ where: { userId: userId }, select: [] });
        return Boolean(entity);
    }

    public async getByCredentials(credentials: Credentials): Promise<LocalLogin> {
        const entity = await this._loginRepo.findOne(this.findByPrimaryConditions(credentials));
        if (!entity) {
            return null;
        }
        return this.toLocalLoginModel(entity);
    }

    public async generateEmailCode(userId: string, email: string): Promise<string> {
        const entity = new EmailConfirmEntity();
        entity.userId = userId;
        entity.email = email;
        entity.code = cryptoRandomString({ length: EMAIL_CODE_LENGTH, type: "numeric" });
        entity.sentCount = 1;
        entity.lastSendRequestAt = new Date();
        await entity.save();
        return entity.code;
    }

    public async getCodeAndIncrementCounter(email: string): Promise<string> {
        const entity = await this._emailConfirmRepo.findOne({ email: email });
        if (!entity) {
            return null;
        }

        if (entity.sentCount >= this._resendCountLimit + 1) {
            throw new EmailResendCodeLimitException();
        }

        if (this.isSendRequestTooOften(entity.lastSendRequestAt)) {
            throw new EmailResendCodeTimeLimitException();
        }

        entity.lastSendRequestAt = new Date();
        entity.sentCount++;
        await entity.save();

        return entity.code;
    }

    public async confirmCode(email: string, code: string): Promise<boolean> {
        const confirm = await this._emailConfirmRepo.findOne({ email: email, code: code });
        if (!confirm) {
            return false;
        }
        const user = await this._loginRepo.findOne({ userId: confirm.userId });
        user.emailConfirmed = true;
        await user.save();
        await this._emailConfirmRepo.remove(confirm);
        return true;
    }

    public async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const entity = await this._loginRepo.findOne({ where: { userId: userId } });
        if (!entity) {
            throw new UserNotLocalException();
        }

        const isPasswordMatch = await this._passService.verify(oldPassword, entity.passwordHash);
        if (!isPasswordMatch) {
            throw new InvalidPasswordException("Cannot change password because old password doesn't match.");
        }
        entity.passwordHash = await this._passService.hash(newPassword);
        await entity.save();
    }

    public async resetPassword(token: string, password: string) {
        token = token.toUpperCase();
        const passReset = await this._passResetRepo.findOne({ where: { code: token } });
        if (!passReset) {
            throw new NotFoundException();
        }

        const model = this.toPasswordResetModel(passReset);
        if (model.isExpired(this._passResetCodeTTL)) {
            throw new ExpiredResetCodeException();
        }

        const entity = await this._loginRepo.findOne({ where: { userId: passReset.userId } });

        entity.passwordHash = await this._passService.hash(password);
        await entity.save();

        await passReset.remove();
    }

    public async generatePasswordResetCode(login: LocalLogin): Promise<string> {
        const code = cryptoRandomString({ length: PASSWORD_RESET_CODE_LENGTH, type: "hex" }).toUpperCase();
        let passReset = await this._passResetRepo.findOne({ where: { userId: login.userId } });
        if (passReset) {
            passReset.createdAt = new Date();
        } else {
            passReset = new PasswordResetEntity();
            passReset.userId = login.userId;
        }
        passReset.method = this.getPasswordResetMethod(login);
        passReset.code = code;
        await passReset.save();

        return code;
    }

    public async verifyPassword(userId: string, password: string): Promise<boolean> {
        const user = await this._loginRepo.findOne({ userId: userId });
        if (!user) {
            return false;
        }
        return await this._passService.verify(password, user.passwordHash);
    }

    private getPasswordResetMethod(credentials: Credentials): PasswordResetMethod {
        const primary = credentials.getPrimary();
        if (primary === PrimaryLoginType.email) {
            return PasswordResetMethod.email;
        }
        if (primary === PrimaryLoginType.phone) {
            return PasswordResetMethod.phone;
        }
        throw new Error("Invalid password reset method.");
    }

    private isSendRequestTooOften(lastRequestAt: Date): boolean {
        return moment().unix() - moment(lastRequestAt).unix() < this._resendTimeLimit.seconds;
    }

    private toLocalLoginModel(entity: LocalLoginEntity): LocalLogin {
        const phone = new Phone(entity.phoneCode, entity.phoneNumber);
        return new LocalLogin(entity.userId, entity.email, entity.emailConfirmed, entity.username, phone);
    }

    private findByConditions(credentials: Credentials) {
        const conditions: FindConditions<LocalLoginEntity>[] = [];
        if (credentials.email) {
            conditions.push({ email: credentials.email });
        }
        if (credentials.username) {
            conditions.push({ username: credentials.username });
        }
        if (credentials.phone) {
            conditions.push({ phoneCode: credentials.phone.code, phoneNumber: credentials.phone.number });
        }
        return conditions;
    }

    private findByPrimaryConditions(credentials: Credentials) {
        const conditions: FindConditions<LocalLoginEntity> = {};
        const primary = credentials.getPrimary();
        if (primary === PrimaryLoginType.email) {
            conditions.email = credentials.email;
        } else if (primary === PrimaryLoginType.username) {
            conditions.username = credentials.username;
        } else if (primary === PrimaryLoginType.phone) {
            conditions.phoneCode = credentials.phone.code;
            conditions.phoneNumber = credentials.phone.number;
        }
        return conditions;
    }

    private toPasswordResetModel(entity: PasswordResetEntity): PasswordReset {
        return new PasswordReset(entity.userId, entity.code, entity.method, entity.createdAt);
    }
}
