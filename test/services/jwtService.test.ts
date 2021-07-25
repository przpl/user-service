import "reflect-metadata";

import jwt from "jsonwebtoken";
import moment from "moment";

import { AccessTokenDto } from "../../src/models/dtos/accessTokenDto";
import { JwtService } from "../../src/services/jwtService";
import { mockEnv } from "../mocks/mockEnv";

const env = mockEnv();
const sut = new JwtService(env);

describe("issueAccessToken()", () => {
    it("should issue token", async () => {
        const token = sut.issueAccessToken("sessionCookie", "user1", ["admin"]);
        const data = jwt.decode(token) as any;

        expect(data.sub).toBe("user1");
        expect(data.ref).toBe("sessio");
        expect(data.rol.length).toBe(1);
        expect(data.rol[0]).toBe("admin");
        expect(data.exp - data.iat).toBe(10 * 60);
    });
});

describe("decodeToken()", () => {
    it("should throw exception if key is invalid", async () => {
        const token =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMSIsInJlZiI6InJlZnJlIiwicm9sIjpbImFkbWluIl0sImlhdCI6MTU5NDE0ODMxNCwiZXhwIjoxNTk0MTQ4OTE0fQ.1auDpnCyDE5Bum4wUgjj-TgJ8InK5BCD9scOKzceQRw";
        let thrown = false;

        try {
            sut.decodeAccessToken(token);
        } catch (error) {
            thrown = true;
            expect(error.name).toBe("JsonWebTokenError");
        }

        expect(thrown).toBe(true);
    });

    it("should throw exception if type is invalid", async () => {
        const dataToSign = {
            sub: "user1",
            ref: "ref",
            iat: moment().unix(),
            exp: moment().add(30, "minutes").unix(),
            typ: "otherType",
        } as any;
        const token = jwt.sign(dataToSign, env.jwtPrivateKey);

        expect(() => sut.decodeAccessToken(token)).toThrowError("Invalid token type.");
    });

    it("should throw exception if token expired", async () => {
        const dataToSign = {
            sub: "user1",
            ref: "ref",
            iat: moment().subtract(31, "minutes").unix(),
            exp: moment().subtract(1, "minutes").unix(),
        } as AccessTokenDto;
        const token = jwt.sign(dataToSign, env.jwtPrivateKey);
        let thrown = false;

        try {
            sut.decodeAccessToken(token);
        } catch (error) {
            thrown = true;
            expect(error.name).toBe("TokenExpiredError");
        }

        expect(thrown).toBe(true);
    });

    it("should decode token", async () => {
        const token = sut.issueAccessToken("sessionCookie", "user1", ["admin"]);

        const result = sut.decodeAccessToken(token);

        expect(result.sub).toBe("user1");
        expect(result.ref).toBe("sessio");
        expect(result.rol.length).toBe(1);
        expect(result.rol[0]).toBe("admin");
        expect(result.exp - result.iat).toBe(10 * 60);
    });
});
