import "reflect-metadata";

import jwt from "jsonwebtoken";
import moment from "moment";

import { ExternalUserJwtService, ExternalUserRegistrationJwt } from "../../src/services/externalUserJwtService";
import Env from "../../src/utils/config/env";
import { ExternalUser } from "../../src/middleware/passport";
import { ExternalLoginProvider } from "../../src/dal/entities/externalLoginEntity";

const user: ExternalUser = {
    id: "1",
    firstName: "first",
    lastName: "last",
    email: "email",
};
const key = "12345678901234567890123456789012345678901234567890";
const env = { jwtPrivateKey: key } as Env;
const sut = new ExternalUserJwtService(env);

describe("issueToken()", () => {
    it("should issue token", async () => {
        const token = sut.issueToken(user, ExternalLoginProvider.google);
        const data = jwt.decode(token) as any;

        expect(data.id).toBe(user.id);
        expect(data.email).toBe(user.email);
        expect(data.firstName).toBe(user.firstName);
        expect(data.lastName).toBe(user.lastName);
        expect(data.provider).toBe(ExternalLoginProvider.google);
        expect(data.typ).toBe("externalUserRegistration");
        expect(data.exp - data.iat).toBe(30 * 60);
    });
});

describe("decodeToken()", () => {
    it("should throw exception if key is invalid", async () => {
        const token =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6ImVtYWlsIiwiZmlyc3ROYW1lIjoiZmlyc3QiLCJsYXN0TmFtZSI6Imxhc3QiLCJwcm92aWRlciI6MSwidHlwZSI6ImV4dGVybmFsVXNlclJlZ2lzdHJhdGlvbiIsImlhdCI6MTU5NDE0NDQ5OH0.S79jPYHUYutKEW9lZovQC9_Cnh34GZ7NU2_WkzS78qU";
        let thrown = false;

        try {
            sut.decodeToken(token);
        } catch (error) {
            thrown = true;
            expect(error.name).toBe("JsonWebTokenError");
        }

        expect(thrown).toBe(true);
    });

    it("should throw exception if type is invalid", async () => {
        const token =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6ImVtYWlsIiwiZmlyc3ROYW1lIjoiZmlyc3QiLCJsYXN0TmFtZSI6Imxhc3QiLCJwcm92aWRlciI6MSwidHlwZSI6ImludmFsaWRUeXBlIiwiaWF0IjoxNTk0MTQ0NDk4fQ.9DWBQGmF6_xj24EYOx8Gymkuyp5jVV9xLt2NN0mAuWc";

        expect(() => sut.decodeToken(token)).toThrowError("Invalid token type.");
    });

    it("should throw exception if token expired", async () => {
        const dataToSign = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            provider: ExternalLoginProvider.google,
            typ: "externalUserRegistration",
            iat: moment().subtract(31, "minutes").unix(),
            exp: moment().subtract(1, "minutes").unix(),
        } as ExternalUserRegistrationJwt;
        const token = jwt.sign(dataToSign, key);
        let thrown = false;

        try {
            sut.decodeToken(token);
        } catch (error) {
            thrown = true;
            expect(error.name).toBe("TokenExpiredError");
        }

        expect(thrown).toBe(true);
    });

    it("should decode token", async () => {
        const token = sut.issueToken(user, ExternalLoginProvider.google);

        const result = sut.decodeToken(token);

        expect(result.id).toBe(user.id);
        expect(result.email).toBe(user.email);
        expect(result.firstName).toBe(user.firstName);
        expect(result.lastName).toBe(user.lastName);
        expect(result.provider).toBe(ExternalLoginProvider.google);
        expect(result.typ).toBe("externalUserRegistration");
    });
});
