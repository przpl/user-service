import { TimeSpan } from "./timeSpan";

export function unixTimestampS(): number {
    return Math.round(+new Date() / 1000);
}

export function toUnixTimestampS(date: Date): number {
    return Math.round(+date / 1000);
}

export function isExpired(date: Date, expiresAfter: TimeSpan): boolean {
    const inSeconds = toUnixTimestampS(date);
    return inSeconds + expiresAfter.seconds < unixTimestampS();
}
