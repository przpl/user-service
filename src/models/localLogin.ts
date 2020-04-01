import { Phone } from "./phone";
import { Credentials } from "./credentials";

export class LocalLogin extends Credentials {
    protected _emailConfirmed: boolean;

    constructor(email: string, emailConfirmed: boolean, username: string, phone: Phone) {
        super(email, username, phone);
        this._emailConfirmed = emailConfirmed;
    }

    public get emailConfirmed(): boolean {
        return this._emailConfirmed;
    }
}
