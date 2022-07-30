import { AssertionError } from "node:assert";
import { SpamProtector } from "../../src/services/spamProtector";

describe("SpamProtector", () => {
    const sut = new SpamProtector();

    describe("isDisallowedEmail()", () => {
        it("should return true if email is disallowed", () => {
            expect(sut.isDisallowedEmail("email@10minutemail.org")).toBe(true);
        });

        it("should return false if email is allowed", () => {
            expect(sut.isDisallowedEmail("email@gmail.com")).toBe(false);
        });

        it("should throw error if email is invalid", () => {
            expect(() => sut.isDisallowedEmail("emailgmail.com")).toThrow(Error);
            expect(() => sut.isDisallowedEmail("@")).toThrow(Error);
            expect(() => sut.isDisallowedEmail("")).toThrow(Error);
            expect(() => sut.isDisallowedEmail(null)).toThrow(AssertionError);
            expect(() => sut.isDisallowedEmail(undefined)).toThrow(AssertionError);
        });
    });
});
