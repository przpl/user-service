import bcrypt from "bcrypt";
import { isNullOrUndefined } from "util";

export class CryptoService {
    constructor(private _bcryptRounds: number) {
        if (this._bcryptRounds < 12) {
            throw new Error("Minimum count of bcrypt rounds is 12. Smaller number is considered unsafe.");
        }
    }

    public hashPassword(password: string): Promise<string> {
        if (isNullOrUndefined(password)) {
            throw new Error("Cannot hash null or undefined password.");
        }

        return bcrypt.hash(password, this._bcryptRounds);
    }

    public verifyPassword(password: string, expectedHash: string): Promise<boolean> {
        return bcrypt.compare(password, expectedHash);
    }
}
