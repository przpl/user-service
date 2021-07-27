import { Connection, Repository } from "typeorm";

import { UserEntity } from "../../src/dal/entities/userEntity";
import { UserManager } from "../../src/managers/userManger";
import { UserIdGenerator } from "../../src/services/generators/userIdGenerator";
import { TestContainer } from "../mocks/testcontainers";

const idGenerator: UserIdGenerator = {
    generate: (id) => {
        if (id === "user1") {
            return "generatedId";
        }
        throw new Error("Not implemented.");
    },
};

describe("UserManager", () => {
    let testContainer: TestContainer;
    let postgresConnection: Connection;
    let userRepo: Repository<UserEntity>;
    let sut: UserManager;

    beforeEach(async () => {
        testContainer = new TestContainer();
        postgresConnection = await testContainer.getTypeOrmConnection();
        sut = new UserManager(idGenerator, postgresConnection);
        userRepo = postgresConnection.getRepository(UserEntity);
    }, 30000);

    afterEach(async () => {
        await testContainer.cleanup();
    }, 15000);

    describe("create()", () => {
        it("should create user", async () => {
            await sut.create("user1");

            const user = await userRepo.findOne();
            expect(user.id).toBe("generatedId");
            expect(user.username).toBe("user1");
        });
    });

    describe("delete()", () => {
        it("should not delete not existing user", async () => {
            await sut.create("user1");

            await sut.delete("someId");

            expect(await userRepo.count()).toBe(1);
        });

        it("should delete existing user", async () => {
            await sut.create("user1");

            await sut.delete("generatedId");

            expect(await userRepo.count()).toBe(0);
        });
    });

    describe("exists()", () => {
        it("should return false if user does not exist", async () => {
            await sut.create("user1");

            const exists = await sut.exists("someId");

            expect(exists).toBeFalsy();
        });

        it("should return true if user not exists", async () => {
            await sut.create("user1");

            const exists = await sut.exists("generatedId");

            expect(exists).toBeTruthy();
        });
    });

    describe("doesUsernameExist()", () => {
        it("should return false if username does not exist", async () => {
            await sut.create("user1");

            const exists = await sut.doesUsernameExist("user2");

            expect(exists).toBeFalsy();
        });

        it("should return true if username not exists", async () => {
            await sut.create("user1");

            const exists = await sut.doesUsernameExist("user1");

            expect(exists).toBeTruthy();
        });
    });
});
