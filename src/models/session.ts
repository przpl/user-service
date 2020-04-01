export class Session {
    private _token: string;
    private _userId: string;

    constructor(token: string, userId: string) {
        this._token = token;
        this._userId = userId;
    }

    public get token(): string {
        return this._token;
    }

    public get userId(): string {
        return this._userId;
    }
}
