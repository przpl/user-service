import moment from "moment";

import { TimeSpan } from "../utils/timeSpan";

export abstract class Expirable {
    constructor(private fieldName: string) {}

    public isExpired(expiresAfter: TimeSpan): boolean {
        const date = (this as any)[this.fieldName];
        return isExpired(date, expiresAfter);
    }
}

export function isExpired(date: moment.MomentInput, expiresAfter: TimeSpan, now?: moment.MomentInput): boolean {
    return moment(date)
        .add(expiresAfter.seconds, "seconds")
        .isBefore(now || moment());
}
