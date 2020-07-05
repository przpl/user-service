import { isNullOrUndefined } from "util";

export function guardNotUndefinedOrNull(value: any) {
    if (isNullOrUndefined(value)) {
        throw new Error("Value is null or undefined.");
    }
}
