import { isNullOrUndefined } from "util";

import bcrypt from "bcrypt";
import { singleton } from "tsyringe";

import { Config } from "../utils/config/config";

@singleton()
export class PasswordService {
    private _bcryptRounds: number;

    constructor(config: Config) {
        this._bcryptRounds = config.security.bcryptRounds;
        if (this._bcryptRounds < 12) {
            throw new Error("Minimum count of bcrypt rounds is 12. Smaller number is considered unsafe.");
        }
    }

    public hash(password: string): Promise<string> {
        if (isNullOrUndefined(password)) {
            throw new Error("Cannot hash null or undefined password.");
        }

        return bcrypt.hash(password, this._bcryptRounds);
    }

    public verify(password: string, expectedHash: string): Promise<boolean> {
        return bcrypt.compare(password, expectedHash);
    }
}
