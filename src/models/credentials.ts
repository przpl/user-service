import { Phone } from "./phone";

export enum PrimaryLoginType {
    email,
    username,
    phone,
}

export class Credentials {
    protected _email: string;
    protected _username: string;
    protected _phone: Phone;

    constructor(email: string, username: string, phone: Phone) {
        this._email = email;
        this._username = username;
        this._phone = phone;
    }

    public get email(): string {
        return this._email;
    }

    public get username(): string {
        return this._username;
    }

    public get phone(): Phone {
        return this._phone;
    }

    public getPrimary(): PrimaryLoginType {
        let type: PrimaryLoginType = null;
        let notEmpty = 0;
        if (!!this._email) {
            notEmpty++;
            type = PrimaryLoginType.email;
        }
        if (!!this._username) {
            notEmpty++;
            type = PrimaryLoginType.username;
        }
        if (!!this._phone) {
            notEmpty++;
            type = PrimaryLoginType.phone;
        }

        if (notEmpty !== 1) {
            throw new Error("Only one value is allowed for primary login value.");
        }

        return type;
    }
}
