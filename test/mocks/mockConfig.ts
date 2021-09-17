import { Config } from "../../src/utils/config/config";

export function mockConfig(): Config {
    return {
        mode: "session",
        session: { cacheExpirationSeconds: 3600, maxPerUser: 5 },
        localLogin: {
            email: {
                allowLogin: true,
                resendLimit: 3,
                resendTimeLimitSeconds: 10,
            },
            phone: {
                allowLogin: false,
                resendLimit: 3,
                resendTimeLimitSeconds: 10,
            },
            username: { hashKey: "123" },
        },
        passwordReset: { codeExpirationTimeInMinutes: 5 },
    } as Config;
}
