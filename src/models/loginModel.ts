import { PhoneModel } from "./phoneModel";

export enum PrimaryLoginType {
    email,
    username,
    phone,
}

export class LoginModel {
    constructor(private _email: string, private _username: string, private _phone: PhoneModel) {}

    public get email(): string {
        return this._email;
    }

    public get username(): string {
        return this._username;
    }

    public get phone(): PhoneModel {
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
