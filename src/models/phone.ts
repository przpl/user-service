import assert from "node:assert";

export class Phone {
    constructor(private _code: string, private _number: string) {
        assert(_code);
        assert(_number);
    }

    public get code(): string {
        return this._code;
    }

    public get number(): string {
        return this._number;
    }

    public toString(): string {
        return `${this._code}::${this._number}`;
    }
}
