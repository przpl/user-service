import { TimeSpan } from "./timeSpan";

export function unixTimestamp(): number {
    return Math.round(+new Date() / 1000);
}

export function toUnixTimestamp(date: Date): number {
    return Math.round(+date / 1000);
}

export function isExpired(date: Date, expiresAfter: TimeSpan): boolean {
    const inSeconds = toUnixTimestamp(date);
    return inSeconds + expiresAfter.seconds < unixTimestamp();
}
