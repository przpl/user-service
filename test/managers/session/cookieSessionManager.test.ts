import redis from "redis";
import { Connection, Repository } from "typeorm";

import { CacheDb } from "../../../src/dal/cacheDb";
import { SessionEntity } from "../../../src/dal/entities/sessionEntity";
import { UserEntity } from "../../../src/dal/entities/userEntity";
import { CookieSessionCacheStrategy } from "../../../src/managers/session/cookieSessionCacheStrategy";
import { CookieSessionManager } from "../../../src/managers/session/cookieSessionManager";
import { SESSION_ID_LENGTH } from "../../../src/utils/globalConsts";
import { mockConfig } from "../../mocks/mockConfig";
import { mockUserAgent } from "../../mocks/mockUserAgent";
import { TestContainer } from "../../mocks/testcontainers";

describe("CookieSessionManager", () => {
    let testContainer: TestContainer;
    let postgresConnection: Connection;
    let redisClient: redis.RedisClient;
    let cacheDb: CacheDb;
    let sessionRepo: Repository<SessionEntity>;
    let sut: CookieSessionManager;

    beforeEach(async () => {
        testContainer = new TestContainer();
        postgresConnection = await testContainer.getTypeOrmConnection();
        redisClient = await testContainer.getRedisClient();

        cacheDb = new CacheDb(redisClient);
        const config = mockConfig();
        const cacheStrategy = new CookieSessionCacheStrategy(cacheDb, config);
        sut = new CookieSessionManager(cacheDb, cacheStrategy, postgresConnection, config);
        const user = new UserEntity("user1", "username1");
        await postgresConnection.getRepository(UserEntity).save(user);
        sessionRepo = postgresConnection.getRepository(SessionEntity);
    }, 30000);

    afterEach(async () => {
        await testContainer.cleanup();
    }, 15000);

    it("getUserIdFromSession() - not existing session should return null", async () => {
        const userId = await sut.getUserIdFromSession("cookie1", "127.0.0.1");
        expect(userId).toBeNull();
    });

    it("getUserIdFromSession() - should get session from db", async () => {
        const sid = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
        await cacheDb.removeSession(sid);

        const userIdFromDb = await sut.getUserIdFromSession(sid, "127.0.0.2");

        expect(userIdFromDb).toBe("user1");
        const session = await sessionRepo.findOne();
        expect(session.lastRefreshIp).toBe("127.0.0.2");
        expect(session.lastUseAt).toBeTruthy();
        expect(await cacheDb.getSession(sid)).toBe("user1");
    });

    it("getUserIdFromSession() - should get session from cache", async () => {
        const sid = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
        await sessionRepo.clear();

        const userIdFromCache = await sut.getUserIdFromSession(sid, "127.0.0.1");

        expect(userIdFromCache).toBe("user1");
        expect(await sessionRepo.findOne()).toBeFalsy();
    });

    it("issueSession() - should issue session", async () => {
        const sid = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

        const session = await sessionRepo.findOne();
        expect(session.id).toHaveLength(SESSION_ID_LENGTH);
        expect(session.userId).toBe("user1");
        expect(session.createIp).toBe("127.0.0.1");
        expect(session.lastRefreshIp).toBe("127.0.0.1");
        const ua = mockUserAgent();
        expect(session.browser).toBe(ua.browser);
        expect(session.os).toBe(ua.os);
        expect(session.osVersion).toBe(ua.osVersion);
        expect(session.lastUseAt).toBeTruthy();
        expect(await cacheDb.getSession(sid)).toBe("user1");
    });

    it("issueSession() - should issue sessions with different ids", async () => {
        const ids: string[] = [];
        for (let i = 0; i < 5; i++) {
            ids.push(await sut.issueSession("user1", "127.0.0.1", mockUserAgent()));
        }

        expect(new Set(ids).size).toBe(ids.length);
    });

    it("issueSession() - should respect sessions limit", async () => {
        const config = mockConfig();
        const ids: string[] = [];
        for (let i = 0; i < config.session.maxPerUser + 2; i++) {
            ids.push(await sut.issueSession("user1", "127.0.0.1", mockUserAgent()));
        }

        expect(await sessionRepo.count()).toBe(config.session.maxPerUser);
        let sessionsInCache = 0;
        for (const id of ids) {
            if (await cacheDb.getSession(id)) {
                sessionsInCache++;
            }
        }
        expect(sessionsInCache).toBe(1);
    });

    it("removeAllSessions() - should remove all user sessions", async () => {
        const user = new UserEntity("user2", "username2");
        await postgresConnection.getRepository(UserEntity).save(user);
        const sid1 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
        const sid2 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
        await sut.issueSession("user2", "127.0.0.1", mockUserAgent());

        await sut.removeAllSessions("user1");

        expect(await sessionRepo.count()).toBe(1);
        expect((await sessionRepo.findOne()).userId).toBe("user2");
        expect(await cacheDb.getSession(sid1)).toBeNull();
        expect(await cacheDb.getSession(sid2)).toBeNull();
    });

    it("removeAllSessions() - should remove not existing user sessions", async () => {
        const sid1 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

        await sut.removeAllSessions("user2");

        expect(await sessionRepo.count()).toBe(1);
        expect((await sessionRepo.findOne()).id).toBe(sid1);
        expect(await cacheDb.getSession(sid1)).toBe("user1");
    });

    it("removeSession() - should remove not cached session", async () => {
        const sid1 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
        const sid2 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

        const removed = await sut.removeSession(sid1);

        expect(removed.id).toBe(sid1);
        expect(await sessionRepo.count()).toBe(1);
        expect((await sessionRepo.findOne()).id).toBe(sid2);
        expect(await cacheDb.getSession(sid2)).toBe("user1");
    });

    it("removeSession() - should remove cached session", async () => {
        const sid1 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
        const sid2 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

        const removed = await sut.removeSession(sid2);

        expect(removed.id).toBe(sid2);
        expect(await sessionRepo.count()).toBe(1);
        expect((await sessionRepo.findOne()).id).toBe(sid1);
        expect(await cacheDb.getSession(sid1)).toBeNull;
    });

    it("removeSession() - should not remove not existing session", async () => {
        await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
        await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

        const removed = await sut.removeSession("sessionId");

        expect(removed).toBeNull();
        expect(await sessionRepo.count()).toBe(2);
    });
});
