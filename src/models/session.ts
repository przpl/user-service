export class Session {
    private _id: string;
    private _userId: string;
    private _lastUseAt: Date;
    private _createIp: string;
    private _createdAt: Date;

    constructor(id: string, userId: string, lastUseAt: Date, createIp: string, createdAt: Date) {
        this._id = id;
        this._userId = userId;
        this._lastUseAt = lastUseAt;
        this._createIp = createIp;
        this._createdAt = createdAt;
    }

    public get id(): string {
        return this._id;
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

    public get createdAt(): Date {
        return this._createdAt;
    }
}
