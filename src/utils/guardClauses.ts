import { NullOrUndefinedException } from "../exceptions/exceptions";
import { isNullOrUndefined } from "./isNullOrUndefined";

export function guardNotUndefinedOrNull(value: any) {
    if (isNullOrUndefined(value)) {
        throw new NullOrUndefinedException("Value is null or undefined.");
    }
}
