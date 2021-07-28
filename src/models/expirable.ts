import moment from "moment";

import { TimeSpan } from "../utils/timeSpan";

export abstract class Expirable {
    constructor(private fieldName: string) {}

    public isExpired(expiresAfter: TimeSpan): boolean {
        const date: Date = (this as any)[this.fieldName];
        return this.verify(date, expiresAfter);
    }

    private verify(date: Date, expiresAfter: TimeSpan): boolean {
        return moment(date).add(expiresAfter.seconds, "seconds").isBefore(new Date());
    }
}
