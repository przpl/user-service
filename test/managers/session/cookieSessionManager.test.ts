import { DataSource, Repository } from "typeorm";

import { CacheDb } from "../../../src/dal/cacheDb";
import { SessionEntity } from "../../../src/dal/entities/sessionEntity";
import { UserEntity } from "../../../src/dal/entities/userEntity";
import { NullOrUndefinedException } from "../../../src/exceptions/exceptions";
import { CookieSessionCacheStrategy } from "../../../src/managers/session/cookieSessionCacheStrategy";
import { CookieSessionManager } from "../../../src/managers/session/cookieSessionManager";
import { RedisClient } from "../../../src/types/redisClient";
import { SESSION_ID_LENGTH } from "../../../src/utils/globalConsts";
import { mockConfig } from "../../mocks/mockConfig";
import { mockDataSource } from "../../mocks/mockConnection";
import { mockUserAgent } from "../../mocks/mockUserAgent";
import { TestContainer } from "../../mocks/testcontainers";
import { shouldStartPostgresContainer, shouldStartRedisContainer } from "../../testUtils";

describe("CookieSessionManager", () => {
    let testContainer: TestContainer;
    let postgresConnection: DataSource;
    let redisClient: RedisClient;
    let cacheDb: CacheDb;
    let sessionRepo: Repository<SessionEntity>;
    let sut: CookieSessionManager;

    beforeEach(async () => {
        testContainer = new TestContainer();
        postgresConnection = shouldStartPostgresContainer() ? await testContainer.getTypeOrmConnection() : mockDataSource();
        redisClient = shouldStartRedisContainer() && (await testContainer.getRedisClient());

        cacheDb = new CacheDb(redisClient);
        const config = mockConfig();
        const cacheStrategy = new CookieSessionCacheStrategy(cacheDb, config);
        sut = new CookieSessionManager(cacheDb, cacheStrategy, postgresConnection, config);
        if (shouldStartPostgresContainer()) {
            const user = new UserEntity("user1", "username1");
            await postgresConnection.getRepository(UserEntity).save(user);
        }
        sessionRepo = postgresConnection.getRepository(SessionEntity);
    }, 30000);

    afterEach(async () => {
        await testContainer.cleanup();
    }, 15000);

    describe("getUserIdFromSession()", () => {
        it("not existing session should return null [withPostgresContainer][withRedisContainer]", async () => {
            const userId = await sut.getUserIdFromSession("cookie1");
            expect(userId).toBeNull();
        });

        it("should get session from db [withPostgresContainer][withRedisContainer]", async () => {
            const sid = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
            await cacheDb.removeSession(sid);

            const userIdFromDb = await sut.getUserIdFromSession(sid);

            expect(userIdFromDb).toBe("user1");
            const [session] = await sessionRepo.find();
            expect(session.lastUseAt).toBeTruthy();
            expect(await cacheDb.getSession(sid)).toBe("user1");
        });

        it("should get session from cache [withPostgresContainer][withRedisContainer]", async () => {
            const sid = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
            await sessionRepo.clear();

            const userIdFromCache = await sut.getUserIdFromSession(sid);

            expect(userIdFromCache).toBe("user1");
            const [session] = await sessionRepo.find();
            expect(session).toBeFalsy();
        });
    });

    describe("tryToRecacheSession()", () => {
        it("should throw error if sessionId is null", async () => {
            await expect(() => sut.tryToRecacheSession(null)).rejects.toThrow(NullOrUndefinedException);
        });

        it("not existing session should return null [withPostgresContainer]", async () => {
            const userId = await sut.tryToRecacheSession("cookie1");
            expect(userId).toBeNull();
        });

        it("should get session from db [withPostgresContainer][withRedisContainer]", async () => {
            const sid = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

            const userIdFromDb = await sut.tryToRecacheSession(sid);

            expect(userIdFromDb).toBe("user1");
            const [session] = await sessionRepo.find();
            expect(session.lastUseAt).toBeTruthy();
            expect(await cacheDb.getSession(sid)).toBe("user1");
        });
    });

    describe("issueSession()", () => {
        it("should issue session [withPostgresContainer][withRedisContainer]", async () => {
            const sid = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

            const [session] = await sessionRepo.find();
            expect(session.id).toHaveLength(SESSION_ID_LENGTH);
            expect(session.userId).toBe("user1");
            expect(session.createIp).toBe("127.0.0.1");
            const ua = mockUserAgent();
            expect(session.browser).toBe(ua.browser);
            expect(session.os).toBe(ua.os);
            expect(session.osVersion).toBe(ua.osVersion);
            expect(session.lastUseAt).toBeTruthy();
            expect(await cacheDb.getSession(sid)).toBe("user1");
        });

        it("should issue sessions with different ids [withPostgresContainer][withRedisContainer]", async () => {
            const ids: string[] = [];
            for (let i = 0; i < 5; i++) {
                ids.push(await sut.issueSession("user1", "127.0.0.1", mockUserAgent()));
            }

            expect(new Set(ids).size).toBe(ids.length);
        });

        it("should respect sessions limit [withPostgresContainer][withRedisContainer]", async () => {
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
    });

    describe("removeAllSessions()", () => {
        it("should remove all user sessions [withPostgresContainer][withRedisContainer]", async () => {
            const user = new UserEntity("user2", "username2");
            await postgresConnection.getRepository(UserEntity).save(user);
            const sid1 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
            const sid2 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
            await sut.issueSession("user2", "127.0.0.1", mockUserAgent());

            await sut.removeAllSessions("user1");

            expect(await sessionRepo.count()).toBe(1);
            const [session] = await sessionRepo.find();
            expect(session.userId).toBe("user2");
            expect(await cacheDb.getSession(sid1)).toBeNull();
            expect(await cacheDb.getSession(sid2)).toBeNull();
        });

        it("should remove not existing user sessions [withPostgresContainer][withRedisContainer]", async () => {
            const sid1 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

            await sut.removeAllSessions("user2");

            expect(await sessionRepo.count()).toBe(1);
            const [session] = await sessionRepo.find();
            expect(session.id).toBe(sid1);
            expect(await cacheDb.getSession(sid1)).toBe("user1");
        });
    });

    describe("removeSession()", () => {
        it("should remove not cached session [withPostgresContainer][withRedisContainer]", async () => {
            const sid1 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
            const sid2 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

            const removed = await sut.removeSession(sid1);

            expect(removed.id).toBe(sid1);
            expect(await sessionRepo.count()).toBe(1);
            const [session] = await sessionRepo.find();
            expect(session.id).toBe(sid2);
            expect(await cacheDb.getSession(sid2)).toBe("user1");
        });

        it("should remove cached session [withPostgresContainer][withRedisContainer]", async () => {
            const sid1 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
            const sid2 = await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

            const removed = await sut.removeSession(sid2);

            expect(removed.id).toBe(sid2);
            expect(await sessionRepo.count()).toBe(1);
            const [session] = await sessionRepo.find();
            expect(session.id).toBe(sid1);
            expect(await cacheDb.getSession(sid1)).toBeNull();
        });

        it("should not remove not existing session [withPostgresContainer][withRedisContainer]", async () => {
            await sut.issueSession("user1", "127.0.0.1", mockUserAgent());
            await sut.issueSession("user1", "127.0.0.1", mockUserAgent());

            const removed = await sut.removeSession("sessionId");

            expect(removed).toBeNull();
            expect(await sessionRepo.count()).toBe(2);
        });
    });
});
