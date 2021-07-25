import { Config } from "../../src/utils/config/config";

export function mockConfig(): Config {
    return { mode: "session", security: { bcryptRounds: 12 }, session: { cacheExpirationSeconds: 3600, maxPerUser: 5 } } as Config;
}
