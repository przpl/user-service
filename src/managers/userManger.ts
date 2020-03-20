import { getRepository } from "typeorm";

import { UserEntity, MfaMethod } from "../dal/entities/userEntity";
import { UserExistsException, UserNotExistsException, UserNotConfirmedException, InvalidPasswordException, UserNotLocalException } from "../exceptions/userExceptions";
import { User } from "../interfaces/user";
import { PasswordResetEntity } from "../dal/entities/passwordResetEntity";
import { unixTimestamp, toUnixTimestamp } from "../utils/timeUtils";
import { ExpiredResetCodeException } from "../exceptions/exceptions";
import { CryptoService } from "../services/cryptoService";
import { ExternalLoginEntity, ExternalLoginProvider } from "../dal/entities/externalLogin";
import { PASSWORD_RESET_CODE_LENGTH, EMAIL_SIG_LENGTH } from "../utils/globalConsts";

export class UserManager {
    private _userRepo = getRepository(UserEntity);
    private _passResetRepo = getRepository(PasswordResetEntity);
    private _externalLoginRepo = getRepository(ExternalLoginEntity);

    constructor(private _crypto: CryptoService, private _emailSigKey: string, private _passResetCodeTTLMinutes: number) {
        if (!this._emailSigKey) {
            throw new Error("Email signature key is required.");
        }
        this._emailSigKey = this._emailSigKey.trim();
        if (this._emailSigKey.length < 24) {
            throw new Error("Minimum required email signature length is 24 characters!");
        }
        if (this._passResetCodeTTLMinutes < 5) {
            throw new Error("Password reset code expiration time has to be greater than 5 minutes.");
        }
    }

    public async getUserById(userId: string): Promise<User> {
        const user = await this._userRepo.findOne({ where: { id: userId } });
        return this.toUser(user);
    }

    public async register(email: string, password: string): Promise<User> {
        const user = new UserEntity();
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

        if (!user.isLocalAccount()) {
            throw new InvalidPasswordException("User has no password");
        }

        const isPasswordMatch = await this._crypto.verifyPassword(password, user.passwordHash);
        if (!isPasswordMatch) {
            throw new InvalidPasswordException();
        }

        if (!user.emailConfirmed) {
            throw new UserNotConfirmedException("User account is not confirmed.");
        }

        return this.toUser(user);
    }

    public async loginOrRegisterExternalUser(externalUserId: string, loginProvider: ExternalLoginProvider): Promise<User> {
        const loginInDb = await this._externalLoginRepo.findOne({ externalUserId: externalUserId, provider: loginProvider }); // sarch also by provider to make sure there aren't two different users across platforms with same user id
        if (loginInDb) {
            const userInDb = await this._userRepo.findOne({ id: loginInDb.userId });
            return this.toUser(userInDb);
        }

        const user = await this.registerExternalUser(externalUserId, loginProvider);
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

        if (this.isResetCodeExpired(passReset.createdAt)) {
            throw new ExpiredResetCodeException();
        }

        const user = await this._userRepo.findOne({ where: { id: passReset.userId } });
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
        if (!user.emailConfirmed) {
            throw new UserNotConfirmedException();
        }

        const code = this._crypto.randomHex(PASSWORD_RESET_CODE_LENGTH);
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

    public async confirmEmail(email: string): Promise<boolean> {
        const user = await this._userRepo.findOne({ where: { email: email } });
        if (!user) {
            throw new UserNotExistsException("Cannot update email confirmed status. User not exists");
        }
        if (user.emailConfirmed) {
            return false;
        }
        user.emailConfirmed = true;
        await user.save();
        return true;
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

    public getEmailSignature(email: string): string {
        return this._crypto.hmacSignatureHex(email, this._emailSigKey).slice(0, EMAIL_SIG_LENGTH);
    }

    public verifyEmailSignature(email: string, signature: string): boolean {
        const expected = this.getEmailSignature(email);
        return expected.toUpperCase() === signature.toUpperCase();
    }

    public async verifyPassword(userId: string, password: string): Promise<boolean> {
        const user = await this._userRepo.findOne({ id: userId });
        return await this._crypto.verifyPassword(password, user.passwordHash);
    }

    private async registerExternalUser(externalUserId: string, loginProvider: ExternalLoginProvider): Promise<UserEntity> {
        // TODO use transaciton, make sure user and externalLogin are always created together
        const user = new UserEntity();
        await user.save();

        const login = new ExternalLoginEntity();
        login.provider = loginProvider;
        login.externalUserId = externalUserId;
        login.userId = user.id;
        await login.save();
        return user;
    }

    private isResetCodeExpired(createdAt: Date): boolean {
        const secondsPerMinute = 60;
        const inSeconds = toUnixTimestamp(createdAt);
        return inSeconds + this._passResetCodeTTLMinutes * secondsPerMinute < unixTimestamp();
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
