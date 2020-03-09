import bcrypt from "bcrypt";
import { getRepository } from "typeorm";
import crypto from "crypto";

import { UserEntity } from "../dal/entities/userEntity";
import { UserExistsException, UserNotExistsException } from "../exceptions/userExceptions";
import { User } from "../interfaces/user";

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

        const user = await repository.findOne({
            where: {
                email: email,
            },
        });

        if (!user) {
            await bcrypt.hash(password, SALT_ROUNDS); // ? prevents time attack
            return null;
        }

        const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordMatch) {
            return null;
        }

        return user;
    }

    public async updateEmailConfirmed(email: string, newStatus: boolean) {
        const repository = getRepository(UserEntity);

        const user = await repository.findOne({
            where: {
                email: email,
            },
        });

        if (!user) {
            throw new UserNotExistsException("Cannot update email confirmed status. User not exists");
        }

        user.emailConfirmed = newStatus;
        await user.save();
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
}
