import { Expirable } from "./expirable";
import nameof from "../utils/nameof";

export class Session extends Expirable {
    private _token: string;
    private _userId: string;
    private _lastUseAt: Date;

    constructor(token: string, userId: string, lastUseAt: Date) {
        super(nameof<Session>("lastUseAt"));

        this._token = token;
        this._userId = userId;
        this._lastUseAt = lastUseAt;
    }

    public get token(): string {
        return this._token;
    }

    public get userId(): string {
        return this._userId;
    }

    public get lastUseAt(): Date {
        return this._lastUseAt;
    }
}
