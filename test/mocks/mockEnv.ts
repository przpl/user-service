import Env from "../../src/utils/config/env";

export function mockEnv(): Env {
    return {
        jwtPrivateKey: "12345678901234567890123456789012345678901234",
        xsrfKey: "12345678901234567890123456789012345678901234",
        tokenTTLMinutes: 10,
    } as Env;
}
