export class Lock {
    private _userId: string;
    private _reason: string;

    constructor(userId: string, reason: string) {
        this._userId = userId;
        this._reason = reason;
    }

    public get userId(): string {
        return this._userId;
    }

    public get reason(): string {
        return this._reason;
    }
}
