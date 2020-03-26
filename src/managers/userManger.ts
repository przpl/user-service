import { getRepository } from "typeorm";
import cryptoRandomString from "crypto-random-string";

import { UserEntity, MfaMethod } from "../dal/entities/userEntity";
import {
    UserExistsException,
    UserNotExistsException,
    UserNotConfirmedException,
    InvalidPasswordException,
    UserNotLocalException,
    UserLockedOutException,
} from "../exceptions/userExceptions";
import { User } from "../interfaces/user";
import { PasswordResetEntity } from "../dal/entities/passwordResetEntity";
import { isExpired, unixTimestampS, toUnixTimestampS } from "../utils/timeUtils";
import { ExpiredResetCodeException } from "../exceptions/exceptions";
import { CryptoService } from "../services/cryptoService";
import { ExternalLoginEntity, ExternalLoginProvider } from "../dal/entities/externalLogin";
import { PASSWORD_RESET_CODE_LENGTH, USER_ID_LENGTH } from "../utils/globalConsts";
import { TimeSpan } from "../utils/timeSpan";
import { JsonConfig } from "../utils/config/jsonConfig";

export class UserManager {
    private _userRepo = getRepository(UserEntity);
    private _passResetRepo = getRepository(PasswordResetEntity);
    private _externalLoginRepo = getRepository(ExternalLoginEntity);

    constructor(private _crypto: CryptoService, private _passResetCodeTTL: TimeSpan, private _jsonConfig: JsonConfig) {
        if (this._passResetCodeTTL.seconds < TimeSpan.fromMinutes(5).seconds) {
            throw new Error("Password reset code expiration time has to be greater than 5 minutes.");
        }
    }

    public async getUserById(userId: string): Promise<User> {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        return this.toUser(user);
    }

    public async register(email: string, password: string): Promise<User> {
        const user = new UserEntity(this.generateUserId());
        user.email = email;
        user.passwordHash = await this._crypto.hashPassword(password);

        try {
            await user.save();
        } catch (error) {
            if (error.code === "23505") {
                throw new UserExistsException("E-mail duplicate.");
            }

            throw error;
        }

        return this.toUser(user);
    }

    public async login(email: string, password: string): Promise<User> {
        const user = await this._userRepo.findOne({ where: { email: email } });
        if (!user) {
            await this._crypto.hashPassword(password); // ? prevents time attack
            throw new UserNotExistsException();
        }

        this.assureUserNotLockedOut(user);

        if (!user.isLocalAccount()) {
            throw new InvalidPasswordException("User has no password");
        }

        const isPasswordMatch = await this._crypto.verifyPassword(password, user.passwordHash);
        if (!isPasswordMatch) {
            throw new InvalidPasswordException();
        }

        if (!this._jsonConfig.localLogin.allowLoginWithoutConfirmedEmail && !user.emailConfirmed) {
            throw new UserNotConfirmedException("User account is not confirmed.");
        }

        return this.toUser(user);
    }

    public async loginOrRegisterExternalUser(userId: string, email: string, loginProvider: ExternalLoginProvider): Promise<User> {
        const loginInDb = await this._externalLoginRepo.findOne({ externalUserId: userId, provider: loginProvider }); // sarch also by provider to make sure there aren't two different users across platforms with same user id
        if (loginInDb) {
            const userInDb = await this._userRepo.findOne({ id: loginInDb.userId });
            this.assureUserNotLockedOut(userInDb);
            return this.toUser(userInDb);
        }

        const user = await this.registerExternalUser(userId, email, loginProvider);
        return this.toUser(user);
    }

    public async changePassword(id: string, oldPassword: string, newPassword: string) {
        const user = await this._userRepo.findOne({ where: { id: id } });
        if (!user.isLocalAccount()) {
            throw new InvalidPasswordException("User has no password");
        }
        const isPasswordMatch = await this._crypto.verifyPassword(oldPassword, user.passwordHash);
        if (!isPasswordMatch) {
            throw new InvalidPasswordException("Cannot change password because old password doesn't match.");
        }
        user.passwordHash = await this._crypto.hashPassword(newPassword);
        await user.save();
    }

    public async resetPassword(resetCode: string, password: string) {
        resetCode = resetCode.toUpperCase();
        const passReset = await this._passResetRepo.findOne({ where: { code: resetCode } });
        if (!passReset) {
            throw new UserNotExistsException();
        }

        if (isExpired(passReset.createdAt, this._passResetCodeTTL)) {
            throw new ExpiredResetCodeException();
        }

        const user = await this._userRepo.findOne({ where: { id: passReset.userId } });

        this.assureUserNotLockedOut(user);

        user.passwordHash = await this._crypto.hashPassword(password);
        await user.save();

        await passReset.remove();
    }

    public async generatePasswordResetCode(email: string): Promise<string> {
        const user = await this._userRepo.findOne({ where: { email: email } });
        if (!user) {
            throw new UserNotExistsException();
        }
        if (!user.isLocalAccount()) {
            throw new UserNotLocalException();
        }
        this.assureUserNotLockedOut(user);
        if (!user.emailConfirmed) {
            throw new UserNotConfirmedException();
        }

        const code = cryptoRandomString({ length: PASSWORD_RESET_CODE_LENGTH, type: "hex" }).toUpperCase();
        const passResetInDb = await this._passResetRepo.findOne({ where: { userId: user.id } });
        if (passResetInDb) {
            passResetInDb.code = code;
            passResetInDb.createdAt = new Date();
            await passResetInDb.save();
        } else {
            const passReset = new PasswordResetEntity();
            passReset.userId = user.id;
            passReset.code = code;
            await passReset.save();
        }
        return code;
    }

    public async enableHtopFa(userId: string) {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        user.mfaMethod = MfaMethod.code;
        await user.save();
    }

    public async disableHtopFa(userId: string) {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        user.mfaMethod = MfaMethod.none;
        await user.save();
    }

    public async verifyPassword(userId: string, password: string): Promise<boolean> {
        const user = await this._userRepo.findOne({ id: userId });
        return await this._crypto.verifyPassword(password, user.passwordHash);
    }

    public async lockUser(userId: string, until: Date, reason: string) {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new UserNotExistsException();
        }
        user.lockedUntil = until;
        user.lockReason = reason;
        await user.save();
    }

    public async unlockUser(userId: string) {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new UserNotExistsException();
        }
        user.lockedUntil = null;
        await user.save();
    }

    private assureUserNotLockedOut(user: UserEntity) {
        if (user.lockedUntil && toUnixTimestampS(user.lockedUntil) >= unixTimestampS()) {
            throw new UserLockedOutException(user.lockReason);
        }
    }

    private generateUserId(): string {
        return cryptoRandomString({ length: USER_ID_LENGTH, type: "base64" })
            .replace("+", "0")
            .replace("/", "1");
    }

    private async registerExternalUser(externalUserId: string, email: string, loginProvider: ExternalLoginProvider): Promise<UserEntity> {
        // TODO use transaciton, make sure user and externalLogin are always created together
        const user = new UserEntity(this.generateUserId());
        await user.save();

        const login = new ExternalLoginEntity();
        login.provider = loginProvider;
        login.externalUserId = externalUserId;
        login.userId = user.id;
        login.email = email;
        await login.save();
        return user;
    }

    private toUser(entity: UserEntity): User {
        return {
            id: entity.id,
            email: entity.email,
            mfaMethod: entity.mfaMethod,
            isLocalAccount: entity.isLocalAccount(),
        };
    }
}
