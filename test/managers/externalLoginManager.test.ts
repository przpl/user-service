import { Connection, Repository } from "typeorm";

import { ExternalLoginEntity, ExternalLoginProvider } from "../../src/dal/entities/externalLoginEntity";
import { UserEntity } from "../../src/dal/entities/userEntity";
import { NullOrUndefinedException } from "../../src/exceptions/exceptions";
import { ExternalLoginManager } from "../../src/managers/externalLoginManager";
import { mockConnection } from "../mocks/mockConnection";
import { TestContainer } from "../mocks/testcontainers";
import { shouldStartPostgresContainer } from "../testUtils";

const user1 = new UserEntity("1", "user1");
const user2 = new UserEntity("2", "user2");

describe("ExternalLoginManager", () => {
    let testContainer: TestContainer;
    let postgresConnection: Connection;
    let repo: Repository<ExternalLoginEntity>;
    let sut: ExternalLoginManager;

    beforeEach(async () => {
        testContainer = new TestContainer();
        postgresConnection = shouldStartPostgresContainer() ? await testContainer.getTypeOrmConnection() : mockConnection();
        sut = new ExternalLoginManager(postgresConnection);
        repo = postgresConnection.getRepository(ExternalLoginEntity);
        const userRepo = postgresConnection.getRepository(UserEntity);
        userRepo?.save(user1);
        userRepo?.save(user2);
    }, 30000);

    afterEach(async () => {
        await testContainer.cleanup();
    }, 15000);

    describe("create()", () => {
        it("should create [withPostgresContainer]", async () => {
            await sut.create("1", "facebookId", "facebookgmail.com", ExternalLoginProvider.facebook);
            await sut.create("2", "googleId", "google@gmail.com", ExternalLoginProvider.google);

            expect(await repo.count()).toBe(2);
        });
    });

    describe("getUserId()", () => {
        it("should throw error if user id param is falsy", async () => {
            await expect(() => sut.getUserId(null, ExternalLoginProvider.facebook)).rejects.toThrow(NullOrUndefinedException);
        });

        it("should return null if user does not exist [withPostgresContainer]", async () => {
            await sut.create("1", "facebookId", "facebookgmail.com", ExternalLoginProvider.facebook);
            await sut.create("2", "googleId", "google@gmail.com", ExternalLoginProvider.google);

            const result = await sut.getUserId("otherId", ExternalLoginProvider.facebook);

            expect(result).toBeFalsy();
        });

        it("should return id if user exists [withPostgresContainer]", async () => {
            await sut.create("1", "facebookId", "facebookgmail.com", ExternalLoginProvider.facebook);
            await sut.create("2", "googleId", "google@gmail.com", ExternalLoginProvider.google);

            const facebookUserId = await sut.getUserId("facebookId", ExternalLoginProvider.facebook);
            const googleUserId = await sut.getUserId("googleId", ExternalLoginProvider.google);

            expect(facebookUserId).toBe("1");
            expect(googleUserId).toBe("2");
        });
    });
});
