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
import { CONFIRMATION_CODE_LENGTH, PASSWORD_RESET_CODE_LENGTH } from "../utils/globalConsts";
import { ConfirmationEntity, ConfirmationType } from "../dal/entities/confirmationEntity";
import { ResendCodeLimitException, ResendCodeTimeLimitException, ExpiredResetCodeException } from "../exceptions/exceptions";
import { PasswordResetEntity, PasswordResetMethod } from "../dal/entities/passwordResetEntity";
import { LocalLogin } from "../models/localLogin";
import { Phone } from "../models/phone";
import { PasswordReset } from "../models/passwordReset";
import { UserEntity } from "../dal/entities/userEntity";

export enum LoginDuplicateType {
    none,
    email,
    username,
    phone,
}

export enum LoginResult {
    success,
    emailNotConfirmed,
    phoneNotConfirmed,
    userNotFound,
    invalidPassword,
}

export class LoginOperationResult {
    result: LoginResult;
    login: LocalLogin;
}

interface ConfirmationLimit {
    count: number;
    time: TimeSpan;
}

@singleton()
export class LocalLoginManager {
    private _loginRepo = getRepository(LocalLoginEntity);
    private _confirmRepo = getRepository(ConfirmationEntity);
    private _passResetRepo = getRepository(PasswordResetEntity);
    private _resendLimit: {
        email: ConfirmationLimit;
        phone: ConfirmationLimit;
    };
    private _passResetCodeTTL: TimeSpan;

    constructor(private _passService: PasswordService, private _config: Config) {
        this._resendLimit = {
            email: {
                count: _config.localLogin.email.resendLimit,
                time: TimeSpan.fromSeconds(_config.localLogin.email.resendTimeLimitSeconds),
            },
            phone: {
                count: _config.localLogin.phone.resendLimit,
                time: TimeSpan.fromSeconds(_config.localLogin.phone.resendTimeLimitSeconds),
            },
        };
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

        if (!(await this._passService.verify(password, entity.passwordHash))) {
            return { result: LoginResult.invalidPassword, login: this.toLocalLoginModel(entity) };
        }

        if (this.isEmailNotConfirmed(entity)) {
            return { result: LoginResult.emailNotConfirmed, login: this.toLocalLoginModel(entity) };
        }

        if (this.isPhoneNotConfirmed(entity)) {
            return { result: LoginResult.phoneNotConfirmed, login: this.toLocalLoginModel(entity) };
        }

        return { result: LoginResult.success, login: this.toLocalLoginModel(entity) };
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

    public async generateConfirmationCode(userId: string, subject: string, type: ConfirmationType): Promise<string> {
        const entity = new ConfirmationEntity();
        entity.userId = userId;
        entity.subject = subject;
        entity.code = cryptoRandomString({ length: CONFIRMATION_CODE_LENGTH, type: "numeric" });
        entity.type = type;
        entity.sentCount = 1;
        entity.lastSendRequestAt = new Date();
        await entity.save();
        return entity.code;
    }

    public async getConfirmationCode(subject: string, type: ConfirmationType): Promise<string> {
        const entity = await this._confirmRepo.findOne({ subject: subject, type: type });
        if (!entity) {
            return null;
        }

        const limit = type === ConfirmationType.email ? this._resendLimit.email : this._resendLimit.phone;
        if (entity.sentCount >= limit.count + 1) {
            throw new ResendCodeLimitException();
        }

        if (this.isSendRequestTooOften(entity.lastSendRequestAt, limit.time.seconds)) {
            throw new ResendCodeTimeLimitException();
        }

        entity.lastSendRequestAt = new Date();
        entity.sentCount++;
        await entity.save();

        return entity.code;
    }

    public async confirm(subject: string, code: string, type: ConfirmationType): Promise<boolean> {
        const confirm = await this._confirmRepo.findOne({ subject: subject, code: code });
        if (!confirm) {
            return false;
        }
        const userId = confirm.userId;
        await this._confirmRepo.remove(confirm);

        const update: Partial<LocalLoginEntity> = {};
        if (type === ConfirmationType.email) {
            update.emailConfirmed = true;
        } else {
            update.phoneConfirmed = true;
        }
        await this._loginRepo.update({ userId: userId }, { emailConfirmed: true });

        return true;
    }

    public async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const entity = await this._loginRepo.findOne({ where: { userId: userId } });
        if (!entity) {
            throw new UserNotLocalException();
        }

        if (!(await this._passService.verify(oldPassword, entity.passwordHash))) {
            throw new InvalidPasswordException("Cannot change password because old password doesn't match.");
        }

        entity.passwordHash = await this._passService.hash(newPassword);
        await entity.save();
    }

    public async resetPassword(code: string, password: string) {
        code = code.toUpperCase();
        const passReset = await this._passResetRepo.findOne({ where: { code: code } });
        if (!passReset) {
            throw new NotFoundException();
        }

        const model = this.toPasswordResetModel(passReset);
        if (model.isExpired(this._passResetCodeTTL)) {
            throw new ExpiredResetCodeException();
        }

        await this._loginRepo.update({ userId: passReset.userId }, { passwordHash: await this._passService.hash(password) });

        await passReset.remove();
    }

    public async generatePasswordResetCode(login: LocalLogin): Promise<string> {
        const code = cryptoRandomString({ length: PASSWORD_RESET_CODE_LENGTH, type: "hex" }).toUpperCase();
        let entity = await this._passResetRepo.findOne({ where: { userId: login.userId } });
        if (entity) {
            entity.createdAt = new Date();
        } else {
            entity = new PasswordResetEntity();
            entity.userId = login.userId;
        }
        entity.method = this.getPasswordResetMethod(login);
        entity.code = code;
        await entity.save();

        return code;
    }

    public async verifyPassword(userId: string, password: string): Promise<boolean> {
        const entity = await this._loginRepo.findOne({ userId: userId });
        if (!entity) {
            return false;
        }
        return await this._passService.verify(password, entity.passwordHash);
    }

    private isEmailNotConfirmed(login: LocalLoginEntity) {
        return this._config.localLogin.email.allowLogin && !this._config.localLogin.allowLoginWithoutConfirmedEmail && !login.emailConfirmed;
    }

    private isPhoneNotConfirmed(login: LocalLoginEntity) {
        return this._config.localLogin.phone.allowLogin && !this._config.localLogin.allowLoginWithoutConfirmedPhone && !login.phoneConfirmed;
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

    private isSendRequestTooOften(lastRequestAt: Date, seconds: number): boolean {
        return moment().diff(lastRequestAt, "seconds") < seconds;
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
