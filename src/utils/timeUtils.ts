export function unixTimestamp(): number {
    return Math.trunc(+new Date() / 1000);
}

export function toUnixTimestamp(date: Date): number {
    return Math.round(+date / 1000);
}

export function isExpired(date: Date, expiresAfterInSeconds: number): boolean {
    const inSeconds = toUnixTimestamp(date);
    return inSeconds + expiresAfterInSeconds < unixTimestamp();
}
