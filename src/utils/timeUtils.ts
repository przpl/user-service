export function unixTimestamp(): number {
    return Math.trunc(+new Date() / 1000);
}

export function toUnixTimestamp(date: Date): number {
    return Math.round(+date / 1000);
}
