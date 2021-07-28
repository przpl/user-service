import { UserAgent } from "../../src/interfaces/userAgent";

export function mockUserAgent(): UserAgent {
    return {
        browser: "Browser",
        os: "Operating System",
        osVersion: "1",
    };
}
