import bcrypt from "bcrypt";
import { getRepository } from "typeorm";
import crypto from "crypto";

import { UserEntity } from "../dal/entities/userEntity";
import { UserExistsException, UserNotExistsException, UserNotConfirmedException, InvalidPasswordException } from "../exceptions/userExceptions";
import { User } from "../interfaces/user";
import { PasswordResetEntity } from "../dal/entities/passwordResetEntity";

const SALT_ROUNDS = 12;

export class UserManager {
    constructor(private _emailSigKey: string) {
        if (!this._emailSigKey) {
            throw new Error("Email signature key is required.");
        }
        this._emailSigKey = this._emailSigKey.trim();
        if (this._emailSigKey.length < 32) {
            throw new Error("Minimum required email signature length is 32 characters!");
        }
    }

    public async register(email: string, password: string): Promise<User> {
        const user = new UserEntity();
        user.email = email;
        user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        try {
            await user.save();
        } catch (error) {
            if (error.code === "23505") {
                throw new UserExistsException("E-mail duplicate.");
            }

            throw error;
        }

        return { id: user.id, email: user.email };
    }

    public async login(email: string, password: string): Promise<User> {
        const repository = getRepository(UserEntity);

        const user = await repository.findOne({ where: { email: email } });
        if (!user) {
            await bcrypt.hash(password, SALT_ROUNDS); // ? prevents time attack
            throw new UserNotExistsException();
        }

        const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordMatch) {
            throw new InvalidPasswordException();
        }

        if (!user.emailConfirmed) {
            throw new UserNotConfirmedException("User account is not confirmed.");
        }

        return user;
    }

    public async changePassword(id: string, oldPassword: string, newPassword: string) {
        const repository = getRepository(UserEntity);
        const user = await repository.findOne({ where: { id: id } });
        const isPasswordMatch = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isPasswordMatch) {
            throw new InvalidPasswordException("Cannot change password because old password doesn't match.");
        }
        user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.save();
    }

    public async generatePasswordResetCode(email: string): Promise<string> {
        const userRepository = getRepository(UserEntity);
        const user = await userRepository.findOne({ where: { email: email } });
        if (!user) {
            throw new UserNotExistsException();
        }

        // if (!user.emailConfirmed) {
        //     throw new UserNotConfirmedException();
        // }

        const code = this.generateCode();
        const passwordResetRepository = getRepository(PasswordResetEntity);
        const passResetInDb = await passwordResetRepository.findOne({ where: { userId: user.id } });
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
        const repository = getRepository(UserEntity);
        const user = await repository.findOne({ where: { email: email } });
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

    public getEmailSignature(email: string): string {
        const hmac = crypto.createHmac("sha256", this._emailSigKey);
        hmac.update(email);
        return hmac.digest("hex");
    }

    public verifyEmailSignature(email: string, signature: string): boolean {
        const hmac = crypto.createHmac("sha256", this._emailSigKey);
        hmac.update(email);
        const expected = hmac.digest("hex").toLowerCase();
        return expected === signature.toLowerCase();
    }

    private generateCode(): string {
        const code = crypto.randomBytes(4).toString("hex");
        return code.toUpperCase();
    }
}
