import argon2id from "argon2";
import { singleton } from "tsyringe";

@singleton()
export class PasswordService {
    public async hash(password: string): Promise<string> {
        if (!password) {
            throw new Error("Cannot hash null or undefined password.");
        }

        // https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
        return await argon2id.hash(password, { memoryCost: 4096 * 2, timeCost: 4, parallelism: 1 });
    }

    public async verify(password: string, expectedHash: string): Promise<boolean> {
        return await argon2id.verify(expectedHash, password);
    }
}
