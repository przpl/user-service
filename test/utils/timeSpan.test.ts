import { TimeSpan } from "../../src/utils/timeSpan";

describe("fromSeconds()", () => {
    const sut = TimeSpan.fromSeconds;
    it("should throw error if argument is incorrect", async () => {
        expect(() => sut(NaN)).toThrowError();
        expect(() => sut(undefined)).toThrowError();
        expect(() => sut(null)).toThrowError();
        expect(() => sut(-1)).toThrowError();
        expect(() => sut(0)).toThrowError();
    });

    it("should succeed if value is correct", async () => {
        expect(sut(1).seconds).toBe(1);
    });
});

describe("fromMinutes()", () => {
    const sut = TimeSpan.fromMinutes;
    it("should throw error if argument is incorrect", async () => {
        expect(() => sut(NaN)).toThrowError();
        expect(() => sut(undefined)).toThrowError();
        expect(() => sut(null)).toThrowError();
        expect(() => sut(-1)).toThrowError();
        expect(() => sut(0)).toThrowError();
    });

    it("should succeed if value is correct", async () => {
        expect(sut(1).seconds).toBe(60);
    });
});

describe("fromHours()", () => {
    const sut = TimeSpan.fromHours;
    it("should throw error if argument is incorrect", async () => {
        expect(() => sut(NaN)).toThrowError();
        expect(() => sut(undefined)).toThrowError();
        expect(() => sut(null)).toThrowError();
        expect(() => sut(-1)).toThrowError();
        expect(() => sut(0)).toThrowError();
    });

    it("should succeed if value is correct", async () => {
        expect(sut(1).seconds).toBe(3600);
    });
});
