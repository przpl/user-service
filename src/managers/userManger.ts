import bcrypt from "bcrypt";

import { UserEntity } from "../dal/entities/User";

const SALT_ROUNDS = 12;

export class UserManager {
    public async register(email: string, password: string) {
        const user = new UserEntity();
        user.email = email;
        user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        await user.save();
    }
}
