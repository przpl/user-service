import { Credentials, PrimaryLoginType } from "../../src/models/credentials";
import { Phone } from "../../src/models/phone";

describe("Credentials", () => {
    describe("getPrimary()", () => {
        it("should get email", () => {
            const sut = new Credentials("user1@gmail.com", null, null);

            const result = sut.getPrimary();

            expect(result).toBe(PrimaryLoginType.email);
        });

        it("should get username", () => {
            const sut = new Credentials(null, "username1", null);

            const result = sut.getPrimary();

            expect(result).toBe(PrimaryLoginType.username);
        });

        it("should get phone", () => {
            const sut = new Credentials(null, null, new Phone("+48", "123"));

            const result = sut.getPrimary();

            expect(result).toBe(PrimaryLoginType.phone);
        });

        it("should throw error if no primary subject was provided", () => {
            const sut = new Credentials(null, null, null);

            expect(sut.getPrimary).toThrow();
        });

        it("should throw error if more than one subject was provided", () => {
            const sut = new Credentials("user1@gmail.com", "username1", null);

            expect(sut.getPrimary).toThrow();
        });
    });
});
