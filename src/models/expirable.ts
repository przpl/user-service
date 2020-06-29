import moment from "moment";

import { TimeSpan } from "../utils/timeSpan";

export abstract class Expirable {
    constructor(private fieldName: string) {}

    public isExpired(expiresAfter: TimeSpan): boolean {
        const date = (this as any)[this.fieldName];
        return moment(date).add(expiresAfter.seconds, "seconds").isBefore(moment());
    }
}
