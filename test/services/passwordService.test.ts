import { PasswordService } from "../../src/services/passwordService";
import { mockConfig } from "../mocks/mockConfig";

const sut = new PasswordService(mockConfig());

describe("hash()", () => {
    it("should throw exception if password is undefined", async () => {
        expect(() => sut.hash(undefined)).toThrowError("Cannot hash null or undefined password.");
    });

    it("should throw exception if password is null", async () => {
        expect(() => sut.hash(null)).toThrowError("Cannot hash null or undefined password.");
    });

    it("should hash password", async () => {
        const hash = await sut.hash("password");
        const result = await sut.verify("password", hash);

        expect(result).toBe(true);
    });
});
