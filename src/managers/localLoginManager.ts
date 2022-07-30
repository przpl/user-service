import moment from "moment";
import assert from "node:assert";
import { singleton } from "tsyringe";
import { DataSource, FindOptionsWhere } from "typeorm";

import { ConfirmationEntity, ConfirmationType } from "../dal/entities/confirmationEntity";
import { LocalLoginEntity } from "../dal/entities/localLoginEntity";
import { PasswordResetEntity, PasswordResetMethod } from "../dal/entities/passwordResetEntity";
import { ExpiredResetCodeException, ResendCodeLimitException, ResendCodeTimeLimitException } from "../exceptions/exceptions";
import { InvalidPasswordException, NotFoundException, UserNotLocalException } from "../exceptions/userExceptions";
import { Credentials, PrimaryLoginType } from "../models/credentials";
import { LocalLogin } from "../models/localLogin";
import { PasswordReset } from "../models/passwordReset";
import { Phone } from "../models/phone";
import { generateConfirmationCode, generatePasswordResetCode } from "../services/generator";
import { PasswordService } from "../services/passwordService";
import { Config } from "../utils/config/config";
import { TimeSpan } from "../utils/timeSpan";

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
    private _loginRepo = this._dataSource.getRepository(LocalLoginEntity);
    private _confirmRepo = this._dataSource.getRepository(ConfirmationEntity);
    private _passResetRepo = this._dataSource.getRepository(PasswordResetEntity);
    private _resendLimit: {
        email: ConfirmationLimit;
        phone: ConfirmationLimit;
    };
    private _passResetCodeTTL: TimeSpan;

    constructor(private _dataSource: DataSource, private _passService: PasswordService, private _config: Config) {
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
        this._passResetCodeTTL = TimeSpan.fromMinutes(_config.passwordReset.codeExpirationTimeInMinutes);
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
        if (entity.phoneCode === credentials.phone.code && entity.phoneNumber === credentials.phone.number) {
            return LoginDuplicateType.phone;
        }
        throw new Error("Unable to find local login duplicate.");
    }

    public async create(credentials: Credentials, userId: string, password: string): Promise<LocalLogin> {
        const entity = new LocalLoginEntity();
        entity.userId = userId;
        entity.email = credentials.email;
        entity.username = credentials.username;
        entity.phoneCode = credentials.phone?.code || null;
        entity.phoneNumber = credentials.phone?.number || null;
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

        let result = LoginResult.success;
        if ((await this._passService.verify(password, entity.passwordHash)) === false) {
            result = LoginResult.invalidPassword;
        } else if (this.isEmailNotConfirmed(entity)) {
            result = LoginResult.emailNotConfirmed;
        } else if (this.isPhoneNotConfirmed(entity)) {
            result = LoginResult.phoneNotConfirmed;
        }

        return { result, login: this.toLocalLoginModel(entity) };
    }

    public async isLocal(userId: string): Promise<boolean> {
        assert(userId);
        const entity = await this._loginRepo.findOne({ where: { userId }, select: ["userId"] });
        return Boolean(entity);
    }

    public async getByCredentials(credentials: Credentials): Promise<LocalLogin> {
        const entity = await this._loginRepo.findOneBy(this.findByPrimaryConditions(credentials));
        if (!entity) {
            return null;
        }
        return this.toLocalLoginModel(entity);
    }

    public async generateConfirmationCode(userId: string, subject: string, type: ConfirmationType): Promise<string> {
        const entity = new ConfirmationEntity();
        entity.userId = userId;
        entity.subject = subject;
        entity.code = generateConfirmationCode();
        entity.type = type;
        entity.sentCount = 1;
        entity.lastSendRequestAt = new Date();
        await entity.save();
        return entity.code;
    }

    public async getConfirmationCode(subject: string, type: ConfirmationType): Promise<string> {
        assert(subject);
        assert(type >= 0);

        const entity = await this._confirmRepo.findOneBy({ subject, type });
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
        assert(subject);
        assert(code);

        const confirm = await this._confirmRepo.findOneBy({ subject, code });
        if (!confirm) {
            return false;
        }

        const update: Partial<LocalLoginEntity> = {};
        if (type === ConfirmationType.email) {
            update.emailConfirmed = true;
        } else {
            update.phoneConfirmed = true;
        }
        await this._dataSource.manager.transaction(async (manager) => {
            const userId = confirm.userId; // confirm reference will be null after remove()
            await manager.remove(confirm);
            await manager.update(LocalLoginEntity, { userId }, update);
        });

        return true;
    }

    public async changePassword(userId: string, oldPassword: string, newPassword: string) {
        assert(userId);

        const entity = await this._loginRepo.findOneBy({ userId });
        if (!entity) {
            throw new UserNotLocalException();
        }

        if ((await this._passService.verify(oldPassword, entity.passwordHash)) === false) {
            throw new InvalidPasswordException("Cannot change password because old password doesn't match.");
        }

        entity.passwordHash = await this._passService.hash(newPassword);
        await entity.save();
    }

    public async resetPassword(code: string, password: string): Promise<string> {
        assert(code);

        const passReset = await this._passResetRepo.findOneBy({ code: code.toUpperCase() });
        if (!passReset) {
            throw new NotFoundException();
        }

        const model = this.toPasswordResetModel(passReset);
        if (model.isExpired(this._passResetCodeTTL)) {
            throw new ExpiredResetCodeException();
        }

        const userIdBeforeRemoval = passReset.userId;
        await passReset.remove();

        await this._loginRepo.update({ userId: userIdBeforeRemoval }, { passwordHash: await this._passService.hash(password) });

        return userIdBeforeRemoval;
    }

    public async generatePasswordResetCode(userId: string, method: "email" | "phone"): Promise<string> {
        assert(userId);

        let entity = await this._passResetRepo.findOneBy({ userId });
        if (entity) {
            if (!moment(entity.createdAt).add(60, "seconds").isBefore()) {
                return null;
            }
            entity.createdAt = new Date();
        } else {
            entity = new PasswordResetEntity();
            entity.userId = userId;
        }
        entity.method = this.getPasswordResetMethod(method);
        entity.code = generatePasswordResetCode();
        await entity.save();

        return entity.code;
    }

    public async verifyPassword(userId: string, password: string): Promise<boolean> {
        assert(userId);

        const entity = await this._loginRepo.findOneBy({ userId });
        if (!entity) {
            return false;
        }
        return await this._passService.verify(password, entity.passwordHash);
    }

    private isEmailNotConfirmed(login: LocalLoginEntity) {
        return (
            this._config.localLogin.email.allowLogin && !this._config.localLogin.allowLoginWithoutConfirmedEmail && !login.emailConfirmed
        );
    }

    private isPhoneNotConfirmed(login: LocalLoginEntity) {
        return (
            this._config.localLogin.phone.allowLogin && !this._config.localLogin.allowLoginWithoutConfirmedPhone && !login.phoneConfirmed
        );
    }

    private getPasswordResetMethod(method: "email" | "phone"): PasswordResetMethod {
        if (method === "email") {
            return PasswordResetMethod.email;
        }
        if (method === "phone") {
            return PasswordResetMethod.phone;
        }
        throw new Error("Invalid password reset method.");
    }

    private isSendRequestTooOften(lastRequestAt: Date, seconds: number): boolean {
        return moment().diff(lastRequestAt, "seconds") < seconds;
    }

    private toLocalLoginModel(entity: LocalLoginEntity): LocalLogin {
        const phone = entity.phoneNumber && new Phone(entity.phoneCode, entity.phoneNumber);
        return new LocalLogin(entity.userId, entity.email, entity.emailConfirmed, entity.username, phone);
    }

    private findByConditions(credentials: Credentials) {
        const conditions: FindOptionsWhere<LocalLoginEntity>[] = [];
        if (credentials.email) {
            conditions.push({ email: credentials.email });
        }
        if (credentials.username) {
            conditions.push({ username: credentials.username });
        }
        if (credentials.phone) {
            conditions.push({ phoneCode: credentials.phone.code, phoneNumber: credentials.phone.number });
        }
        if (conditions.length === 0) {
            throw new Error("No conditions.");
        }
        return conditions;
    }

    private findByPrimaryConditions(credentials: Credentials) {
        const conditions: FindOptionsWhere<LocalLoginEntity> = {};
        const primary = credentials.getPrimary();
        if (primary === PrimaryLoginType.email) {
            conditions.email = credentials.email;
        } else if (primary === PrimaryLoginType.username) {
            conditions.username = credentials.username;
        } else if (primary === PrimaryLoginType.phone) {
            conditions.phoneCode = credentials.phone.code;
            conditions.phoneNumber = credentials.phone.number;
        } else {
            throw new Error("Unknown primary condition");
        }
        return conditions;
    }

    private toPasswordResetModel(entity: PasswordResetEntity): PasswordReset {
        return new PasswordReset(entity.userId, entity.code, entity.method, entity.createdAt);
    }
}
