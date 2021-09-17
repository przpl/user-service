import { PasswordService } from "../../src/services/passwordService";

const sut = new PasswordService();

describe("hash", () => {
    it("should throw Error if password is missing", async () => {
        await expect(sut.hash(undefined)).rejects.toThrow(Error);
    });

    it("should hash password", async () => {
        expect(await sut.hash("password")).toHaveLength(95);
    });
});

describe("verify", () => {
    it("should verify password", async () => {
        expect(
            await sut.verify("password", "$argon2i$v=19$m=8192,t=4,p=1$qiODzvUuIg0qf2ulweAadw$nFip6/Vh2U7BlIdCnGYTTaKCk15N8NxmYTk2Sr/sPUI")
        ).toBe(true);
        expect(
            await sut.verify(" password", "$argon2i$v=19$m=8192,t=4,p=1$qiODzvUuIg0qf2ulweAadw$nFip6/Vh2U7BlIdCnGYTTaKCk15N8NxmYTk2Sr/sPUI")
        ).toBe(false);
    });
});
