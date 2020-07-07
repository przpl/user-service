import "reflect-metadata";

import { guardNotUndefinedOrNull } from "../../src/utils/guardClauses";

describe("guardNotUndefinedOrNull()", () => {
    it("should throw error if argument is null", async () => {
        expect(() => guardNotUndefinedOrNull(null)).toThrowError();
    });

    it("should throw error if argument is undefined", async () => {
        expect(() => guardNotUndefinedOrNull(undefined)).toThrowError();
    });

    it("should not throw error if argument is not null nor undefined", async () => {
        guardNotUndefinedOrNull("1");
    });
});
