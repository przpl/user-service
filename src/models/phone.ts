import nameof from "../utils/nameof";
import { throwCtorArgError } from "../utils/commonErrors";

export class Phone {
    constructor(private _code: string, private _number: string) {
        if (!_code) {
            throwCtorArgError(nameof<Phone>("code"));
        }

        if (!_number) {
            throwCtorArgError(nameof<Phone>("number"));
        }
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
