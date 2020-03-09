import bcrypt from "bcrypt";
import { getRepository } from "typeorm";

import { UserEntity } from "../dal/entities/userEntity";
import { UserExistsException } from "../exceptions/userExceptions";
import { User } from "../interfaces/user";

const SALT_ROUNDS = 12;

export class UserManager {
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
            await bcrypt.hash(password, SALT_ROUNDS); // prevents time attack
            return null;
        }

        const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordMatch) {
            return null;
        }

        return user;
    }
}
