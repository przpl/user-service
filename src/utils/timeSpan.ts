export class TimeSpan {
    private constructor(private _seconds: number) {}

    public static fromSeconds(seconds: number): TimeSpan {
        return new TimeSpan(seconds);
    }

    public static fromMinutes(minutes: number): TimeSpan {
        return new TimeSpan(minutes * 60);
    }

    public static fromHours(hours: number): TimeSpan {
        return new TimeSpan(hours * 60 * 60);
    }

    public get seconds(): number {
        return this._seconds;
    }
}
