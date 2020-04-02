import { PasswordResetMethod } from "../dal/entities/passwordResetEntity";
import { Expirable } from "./expirable";
import nameof from "../utils/nameof";

export class PasswordReset extends Expirable {
    private _userId: string;
    private _code: string;
    private _method: PasswordResetMethod;
    private _createdAt: Date;

    constructor(userId: string, code: string, method: PasswordResetMethod, createdAt: Date) {
        super(nameof<PasswordReset>("createdAt"));

        this._userId = userId;
        this._code = code;
        this._method = method;
        this._createdAt = createdAt;
    }

    public get userId(): string {
        return this._userId;
    }

    public get code(): string {
        return this._code;
    }

    public get method(): PasswordResetMethod {
        return this._method;
    }

    public get createdAt(): Date {
        return this._createdAt;
    }
}
