export class TimeSpan {
    private constructor(private _seconds: number) {}

    public static fromSeconds(seconds: number): TimeSpan {
        if (isNaN(seconds)) {
            throw new Error("Cannot instantiate TimeSpan from seconds. 'Seconds' is NaN");
        }
        return new TimeSpan(seconds);
    }

    public static fromMinutes(minutes: number): TimeSpan {
        if (isNaN(minutes)) {
            throw new Error("Cannot instantiate TimeSpan from minutes. 'Minutes' is NaN");
        }
        return new TimeSpan(minutes * 60);
    }

    public static fromHours(hours: number): TimeSpan {
        if (isNaN(hours)) {
            throw new Error("Cannot instantiate TimeSpan from hours. 'Hours' is NaN");
        }
        return new TimeSpan(hours * 60 * 60);
    }

    public get seconds(): number {
        return this._seconds;
    }
}
