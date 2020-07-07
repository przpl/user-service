import "reflect-metadata";

import jwt from "jsonwebtoken";

import { PasswordService } from "../../src/services/passwordService";
import { Config } from "../../src/utils/config/config";

const config = { security: { bcryptRounds: 12 } } as Config;
const sut = new PasswordService(config);

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
