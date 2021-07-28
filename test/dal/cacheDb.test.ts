import redis from "redis";

import { CacheDb } from "../../src/dal/cacheDb";
import { TimeSpan } from "../../src/utils/timeSpan";
import { TestContainer } from "../mocks/testcontainers";

describe("CacheDb", () => {
    let testContainer: TestContainer;
    let redisClient: redis.RedisClient;
    let sut: CacheDb;

    beforeEach(async () => {
        testContainer = new TestContainer();
        redisClient = await testContainer.getRedisClient();
        sut = new CacheDb(redisClient);
    }, 15000);

    afterEach(async () => {
        await testContainer.cleanup();
    }, 7500);

    it("session", async () => {
        await sut.setSession("cookie1", "bob", TimeSpan.fromHours(1));
        await sut.setSession("cookie2", "alice", TimeSpan.fromHours(1));
        await sut.setSession("cookie3", "bob", TimeSpan.fromHours(1));
        const cookie1 = await sut.getSession("cookie1");
        let cookie2 = await sut.getSession("cookie2");
        const cookie3 = await sut.getSession("cookie3");
        expect(cookie1).toBe("bob");
        expect(cookie2).toBe("alice");
        expect(cookie3).toBe("bob");
        await sut.removeSession("cookie2");
        cookie2 = await sut.getSession("cookie2");
        expect(cookie2).toBeNull();

        const cookie1ExpirationTime = await getExpirationTime("sn:cookie1");
        expect(cookie1ExpirationTime).toBeGreaterThan(3500);
        expect(cookie1ExpirationTime).toBeLessThan(3601);
        const cookie3ExpirationTime = await getExpirationTime("sn:cookie3");
        expect(cookie3ExpirationTime).toBeGreaterThan(3500);
        expect(cookie3ExpirationTime).toBeLessThan(3601);
    });

    async function getExpirationTime(key: string): Promise<number> {
        return new Promise((resolve, reject) => {
            redisClient.TTL(key, (err, reply) => {
                if (err) {
                    return reject(err);
                }
                resolve(reply);
            });
        });
    }
});
