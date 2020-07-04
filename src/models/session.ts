import { Expirable } from "./expirable";
import nameof from "../utils/nameof";

export class Session extends Expirable {
    private _token: string;
    private _userId: string;
    private _lastUseAt: Date;
    private _createIp: string;
    private _lastRefreshIp: string;
    private _createdAt: Date;

    constructor(token: string, userId: string, lastUseAt: Date, createIp: string, lastRefreshIp: string, createdAt: Date) {
        super(nameof<Session>("lastUseAt"));

        this._token = token;
        this._userId = userId;
        this._lastUseAt = lastUseAt;
        this._createIp = createIp;
        this._lastRefreshIp = lastRefreshIp;
        this._createdAt = createdAt;
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

    public get createIp(): string {
        return this._createIp;
    }

    public get lastRefreshIp(): string {
        return this._lastRefreshIp;
    }

    public get createdAt(): Date {
        return this._createdAt;
    }
}
