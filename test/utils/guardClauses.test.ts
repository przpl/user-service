import { NullOrUndefinedException } from "../../src/exceptions/exceptions";
import { guardNotUndefinedOrNull } from "../../src/utils/guardClauses";

describe("guardNotUndefinedOrNull()", () => {
    it("should throw error if argument is null", () => {
        expect(() => guardNotUndefinedOrNull(null)).toThrowError(NullOrUndefinedException);
    });

    it("should throw error if argument is undefined", () => {
        expect(() => guardNotUndefinedOrNull(undefined)).toThrowError(NullOrUndefinedException);
    });

    it("should not throw error if argument is not null nor undefined", () => {
        guardNotUndefinedOrNull("1");
    });
});
