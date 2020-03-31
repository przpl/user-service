import nameof from "../utils/nameof";
import { throwCtorArgError } from "../utils/commonErrors";

export class PhoneModel {
    constructor(private _code: string, private _number: string) {
        if (!_code) {
            throwCtorArgError(nameof<PhoneModel>("code"));
        }

        if (!_number) {
            throwCtorArgError(nameof<PhoneModel>("number"));
        }
    }

    public get code(): string {
        return this._code;
    }

    public get number(): string {
        return this._number;
    }
}
