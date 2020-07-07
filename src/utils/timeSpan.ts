export class TimeSpan {
    private constructor(private _seconds: number) {}

    public static fromSeconds(seconds: number): TimeSpan {
        TimeSpan.guard(seconds);
        return new TimeSpan(seconds);
    }

    public static fromMinutes(minutes: number): TimeSpan {
        TimeSpan.guard(minutes);
        return new TimeSpan(minutes * 60);
    }

    public static fromHours(hours: number): TimeSpan {
        TimeSpan.guard(hours);
        return new TimeSpan(hours * 60 * 60);
    }

    public get seconds(): number {
        return this._seconds;
    }

    private static guard(time: number) {
        if (!time || time <= 0) {
            throw new Error(`Cannot instantiate TimeSpan. Received value is ${time}.`);
        }
    }
}
