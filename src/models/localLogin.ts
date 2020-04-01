import { Phone } from "./phone";
import { Credentials } from "./credentials";

export class LocalLogin extends Credentials {
    protected _userId: string;
    protected _emailConfirmed: boolean;

    constructor(userId: string, email: string, emailConfirmed: boolean, username: string, phone: Phone) {
        super(email, username, phone);
        this._userId = userId;
        this._emailConfirmed = emailConfirmed;
    }

    public get userId(): string {
        return this._userId;
    }

    public get emailConfirmed(): boolean {
        return this._emailConfirmed;
    }
}
