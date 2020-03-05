import bcrypt from "bcrypt";

import { UserEntity } from "../dal/entities/User";
import { UserExistsException } from "../exceptions/userExceptions";
import { User } from "../interfaces/user";

const SALT_ROUNDS = 12;

export class UserManager {
    public async register(email: string, password: string): Promise<User> {
        const user = new UserEntity();
        user.email = email;
        user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS); // TODO bcrypt has limit of 72 chars

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
}
