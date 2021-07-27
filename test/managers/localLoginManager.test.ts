import moment from "moment";
import { Connection, Repository } from "typeorm";

import { ConfirmationEntity, ConfirmationType } from "../../src/dal/entities/confirmationEntity";
import { LocalLoginEntity } from "../../src/dal/entities/localLoginEntity";
import { PasswordResetEntity, PasswordResetMethod } from "../../src/dal/entities/passwordResetEntity";
import { UserEntity } from "../../src/dal/entities/userEntity";
import {
    ExpiredResetCodeException,
    NullOrUndefinedException,
    ResendCodeLimitException,
    ResendCodeTimeLimitException,
} from "../../src/exceptions/exceptions";
import { InvalidPasswordException, NotFoundException, UserNotLocalException } from "../../src/exceptions/userExceptions";
import { LocalLoginManager, LoginDuplicateType, LoginOperationResult, LoginResult } from "../../src/managers/localLoginManager";
import { Credentials } from "../../src/models/credentials";
import { LocalLogin } from "../../src/models/localLogin";
import { Phone } from "../../src/models/phone";
import { PasswordService } from "../../src/services/passwordService";
import { CONFIRMATION_CODE_LENGTH, PASSWORD_RESET_CODE_LENGTH } from "../../src/utils/globalConsts";
import { mockConfig } from "../mocks/mockConfig";
import { TestContainer } from "../mocks/testcontainers";

const user1 = new UserEntity("1", "user1");
const user2 = new UserEntity("2", "user2");
const user3 = new UserEntity("3", "user3");

describe("LocalLoginManager", () => {
    let testContainer: TestContainer;
    let postgresConnection: Connection;
    let userRepo: Repository<UserEntity>;
    let confirmRepo: Repository<ConfirmationEntity>;
    let localLoginRepo: Repository<LocalLoginEntity>;
    let passResetRepo: Repository<PasswordResetEntity>;
    let sut: LocalLoginManager;

    beforeEach(async () => {
        testContainer = new TestContainer();
        postgresConnection = await testContainer.getTypeOrmConnection();
        sut = new LocalLoginManager(postgresConnection, new PasswordService(mockConfig()), mockConfig());
        userRepo = postgresConnection.getRepository(UserEntity);
        confirmRepo = postgresConnection.getRepository(ConfirmationEntity);
        localLoginRepo = postgresConnection.getRepository(LocalLoginEntity);
        passResetRepo = postgresConnection.getRepository(PasswordResetEntity);
        userRepo.save(user1);
        userRepo.save(user2);
        userRepo.save(user3);
    }, 30000);

    afterEach(async () => {
        await testContainer.cleanup();
    }, 15000);

    describe("isDuplicate()", () => {
        it("should return none if there is not duplicate", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");
            await sut.create(new Credentials("user2@email.com", "user2", new Phone("+48", "2")), user2.id, "password");
            await sut.create(new Credentials("user3@email.com", "user3", new Phone("+48", "3")), user3.id, "password");
            const results: LoginDuplicateType[] = [];

            results.push(await sut.isDuplicate(new Credentials("otherUser@email.com", null, null)));
            results.push(await sut.isDuplicate(new Credentials(null, "otherUser", null)));
            results.push(await sut.isDuplicate(new Credentials(null, null, new Phone("+48", "456"))));

            expect(results.every((r) => r === LoginDuplicateType.none)).toBeTruthy();
        });

        it("should return email duplicate type if there is duplicate", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", null), user1.id, "password");

            const result = await sut.isDuplicate(new Credentials("user1@email.com", "user2", null));

            expect(result).toBe(LoginDuplicateType.email);
        });

        it("should return username duplicate type if there is duplicate", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", null), user1.id, "password");

            const result = await sut.isDuplicate(new Credentials("user2@email.com", "user1", null));

            expect(result).toBe(LoginDuplicateType.username);
        });

        it("should return phone duplicate type if there is duplicate", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");

            const result = await sut.isDuplicate(new Credentials("user2@email.com", "user2", new Phone("+48", "1")));

            expect(result).toBe(LoginDuplicateType.phone);
        });
    });

    describe("create()", () => {
        it("should create with phone number", async () => {
            const result = await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");

            expect(result.userId).toBe(user1.id);
            expect(result.email).toBe("user1@email.com");
            expect(result.username).toBe("user1");
            expect(result.phone.code).toBe("+48");
            expect(result.phone.number).toBe("1");
        });

        it("should create without phone number", async () => {
            const result = await sut.create(new Credentials("user1@email.com", "user1", null), user1.id, "password");

            expect(result.userId).toBe(user1.id);
            expect(result.email).toBe("user1@email.com");
            expect(result.username).toBe("user1");
            expect(result.phone).toBeFalsy();
        });
    });

    describe("authenticate()", () => {
        it("should return userNotFound if user does not exist", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");
            await sut.create(new Credentials("user2@email.com", "user2", new Phone("+48", "2")), user2.id, "password");
            await sut.create(new Credentials("user3@email.com", "user3", new Phone("+48", "3")), user3.id, "password");
            const results: LoginOperationResult[] = [];

            results.push(await sut.authenticate(new Credentials("other@email.com", null, null), "password"));
            results.push(await sut.authenticate(new Credentials(null, "other", null), "password"));
            results.push(await sut.authenticate(new Credentials(null, null, new Phone("+48", "4")), "password"));

            expect(results.every((r) => r.result === LoginResult.userNotFound && !r.login)).toBeTruthy();
        });

        it("should return invalidPassword if password does not match", async () => {
            const credentials = new Credentials("user1@email.com", null, null);
            await sut.create(credentials, user1.id, "password");

            const result = await sut.authenticate(credentials, "password1");

            expect(result.result).toBe(LoginResult.invalidPassword);
        });

        it("should return emailNotConfirmed if email is not confirmed", async () => {
            const credentials = new Credentials("user1@email.com", null, null);
            await sut.create(credentials, user1.id, "password");

            const result = await sut.authenticate(credentials, "password");

            expect(result.result).toBe(LoginResult.emailNotConfirmed);
        });

        it("should login user if email is confirmed", async () => {
            const credentials = new Credentials("user1@email.com", null, null);
            await sut.create(credentials, user1.id, "password");
            const localLogin = await localLoginRepo.findOne();
            localLogin.emailConfirmed = true;
            await localLogin.save();

            const result = await sut.authenticate(credentials, "password");

            expect(result.result).toBe(LoginResult.success);
            expect(result.login.userId).toBe(user1.id);
        });

        // TODO phoneNotConfirmed
    });

    describe("isLocal()", () => {
        it("should return true if user account is local", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");

            const result = await sut.isLocal(user1.id);

            expect(result).toBeTruthy();
        });

        it("should return false if user account is not local", async () => {
            const result = await sut.isLocal(user1.id);

            expect(result).toBeFalsy();
        });
    });

    describe("getByCredentials()", () => {
        it("should return null if user does not exist", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");
            await sut.create(new Credentials("user2@email.com", "user2", new Phone("+48", "2")), user2.id, "password");
            await sut.create(new Credentials("user3@email.com", "user3", new Phone("+48", "3")), user3.id, "password");
            const results: LocalLogin[] = [];

            results.push(await sut.getByCredentials(new Credentials("other@email.com", null, null)));
            results.push(await sut.getByCredentials(new Credentials(null, "other", null)));
            results.push(await sut.getByCredentials(new Credentials(null, null, new Phone("+48", "4"))));

            expect(results.every((r) => r === null)).toBeTruthy();
        });

        it("should find by email", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");
            await sut.create(new Credentials("user2@email.com", "user2", new Phone("+48", "2")), user2.id, "password");
            await sut.create(new Credentials("user3@email.com", "user3", new Phone("+48", "3")), user3.id, "password");

            const result = await sut.getByCredentials(new Credentials("user1@email.com", null, null));

            expect(result.userId).toBe(user1.id);
        });

        it("should find by username", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");
            await sut.create(new Credentials("user2@email.com", "user2", new Phone("+48", "2")), user2.id, "password");
            await sut.create(new Credentials("user3@email.com", "user3", new Phone("+48", "3")), user3.id, "password");

            const result = await sut.getByCredentials(new Credentials(null, "user2", null));

            expect(result.userId).toBe(user2.id);
        });

        it("should find by phone", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");
            await sut.create(new Credentials("user2@email.com", "user2", new Phone("+48", "2")), user2.id, "password");
            await sut.create(new Credentials("user3@email.com", "user3", new Phone("+48", "3")), user3.id, "password");

            const result = await sut.getByCredentials(new Credentials(null, null, new Phone("+48", "3")));

            expect(result.userId).toBe(user3.id);
        });
    });

    describe("generateConfirmationCode()", () => {
        it("should generate code", async () => {
            const result = await sut.generateConfirmationCode(user1.id, "user1@gmail.com", ConfirmationType.email);

            expect(result).toHaveLength(CONFIRMATION_CODE_LENGTH);
            const confirmation = await confirmRepo.findOne();
            expect(confirmation.userId).toBe(user1.id);
            expect(confirmation.subject).toBe("user1@gmail.com");
            expect(confirmation.code).toBe(result);
            expect(confirmation.type).toBe(ConfirmationType.email);
            expect(confirmation.sentCount).toBe(1);
            expect(confirmation.lastSendRequestAt).toBeTruthy();
        });
    });

    describe("getConfirmationCode()", () => {
        it("should return null if confirmation does not exist", async () => {
            await sut.generateConfirmationCode(user1.id, "user1@gmail.com", ConfirmationType.email);

            const result = await sut.getConfirmationCode("user2@gmail.com", ConfirmationType.email);

            expect(result).toBeNull();
        });

        it("should throw error if sent count is exceeded", async () => {
            await sut.generateConfirmationCode(user1.id, "user1@gmail.com", ConfirmationType.email);
            const confirmation = await confirmRepo.findOne();
            confirmation.sentCount = mockConfig().localLogin.email.resendLimit + 1;
            await confirmation.save();

            await expect(() => sut.getConfirmationCode("user1@gmail.com", ConfirmationType.email)).rejects.toThrow(
                ResendCodeLimitException
            );
        });

        it("should throw error if send is requested too often", async () => {
            await sut.generateConfirmationCode(user1.id, "user1@gmail.com", ConfirmationType.email);

            await expect(() => sut.getConfirmationCode("user1@gmail.com", ConfirmationType.email)).rejects.toThrow(
                ResendCodeTimeLimitException
            );
        });

        it("should get code", async () => {
            await sut.generateConfirmationCode(user1.id, "user1@gmail.com", ConfirmationType.email);
            let confirmation = await confirmRepo.findOne();
            const config = mockConfig();
            const lastSendRequestAt = moment()
                .subtract(config.localLogin.email.resendTimeLimitSeconds + 1, "seconds")
                .toDate();
            confirmation.lastSendRequestAt = lastSendRequestAt;
            await confirmation.save();

            const result = await sut.getConfirmationCode("user1@gmail.com", ConfirmationType.email);

            expect(result).toBe(confirmation.code);
            confirmation = await confirmRepo.findOne();
            expect(confirmation.lastSendRequestAt).not.toBe(lastSendRequestAt);
            expect(confirmation.sentCount).toBe(2);
        });
    });

    describe("confirm()", () => {
        it("should return false if confirmation does not exist", async () => {
            const result = await sut.confirm("user1@gmail.com", "123456", ConfirmationType.email);

            expect(result).toBeFalsy();
        });

        it("should confirm", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", null), user1.id, "password");
            const code = await sut.generateConfirmationCode(user1.id, "user1@gmail.com", ConfirmationType.email);

            const result = await sut.confirm("user1@gmail.com", code, ConfirmationType.email);

            expect(await confirmRepo.count()).toBe(0);
            const localLogin = await localLoginRepo.findOne({ where: { userId: user1.id } });
            expect(localLogin.emailConfirmed).toBeTruthy();
            expect(result).toBeTruthy();
        });
    });

    describe("changePassword()", () => {
        it("should throw error if user id param is falsy", async () => {
            await expect(() => sut.changePassword(null, "oldPass", "newPass")).rejects.toThrow(NullOrUndefinedException);
        });

        it("should throw error if user does not exist", async () => {
            await expect(() => sut.changePassword(user1.id, "oldPass", "newPass")).rejects.toThrow(UserNotLocalException);
        });

        it("should throw error if old password does not match", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", null), user1.id, "password");

            await expect(() => sut.changePassword(user1.id, "oldPass", "newPass")).rejects.toThrow(InvalidPasswordException);
        });

        it("should change password", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", null), user1.id, "oldPass");
            const oldHash = (await localLoginRepo.findOne()).passwordHash;

            await sut.changePassword(user1.id, "oldPass", "newPass");

            const localLogin = await localLoginRepo.findOne();
            expect(localLogin.passwordHash).not.toBe(oldHash);
        });
    });

    describe("resetPassword()", () => {
        it("should throw error if code wasn't generated", async () => {
            await expect(() => sut.resetPassword("code", "newPass")).rejects.toThrow(NotFoundException);
        });

        it("should throw error if code is invalid", async () => {
            await sut.generatePasswordResetCode(user1.id, "email");

            await expect(() => sut.resetPassword("code", "newPass")).rejects.toThrow(NotFoundException);
        });

        it("should throw error if code is expired", async () => {
            const code = await sut.generatePasswordResetCode(user1.id, "email");
            const passReset = await passResetRepo.findOne();
            const config = mockConfig();
            passReset.createdAt = moment(passReset.createdAt)
                .subtract(config.passwordReset.codeExpirationTimeInMinutes, "minutes")
                .subtract(1, "seconds")
                .toDate();
            await passReset.save();

            await expect(() => sut.resetPassword(code, "newPass")).rejects.toThrow(ExpiredResetCodeException);
        });

        it("should change password", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");
            const code = await sut.generatePasswordResetCode(user1.id, "email");
            const oldHash = (await localLoginRepo.findOne()).passwordHash;

            const userId = await sut.resetPassword(code, "newPass");

            expect(await passResetRepo.count()).toBe(0);
            const localLogin = await localLoginRepo.findOne();
            expect(localLogin.passwordHash).not.toBe(oldHash);
            expect(userId).toBe(user1.id);
        });
    });

    describe("generatePasswordResetCode()", () => {
        it("should throw error if user id param is falsy", async () => {
            await expect(() => sut.generatePasswordResetCode(null, "email")).rejects.toThrow(NullOrUndefinedException);
        });

        it("should generate new code if old does not exist", async () => {
            const code = await sut.generatePasswordResetCode(user1.id, "email");

            expect(code).toHaveLength(PASSWORD_RESET_CODE_LENGTH);
            const passReset = await passResetRepo.findOne();
            expect(passReset.userId).toBe(user1.id);
            expect(passReset.method).toBe(PasswordResetMethod.email);
            expect(passReset.code).toBe(code);
        });

        it("should update code if old exists", async () => {
            const oldCode = await sut.generatePasswordResetCode(user1.id, "email");
            const passReset = await passResetRepo.findOne();
            passReset.createdAt = moment(passReset.createdAt).subtract(61, "seconds").toDate();
            await passReset.save();
            const newCode = await sut.generatePasswordResetCode(user1.id, "email");

            expect(oldCode).not.toBe(newCode);
            expect(await passResetRepo.count()).toBe(1);
        });

        it("should not update code if old was generated less than 60 seconds before", async () => {
            const oldCode = await sut.generatePasswordResetCode(user1.id, "email");
            const newCode = await sut.generatePasswordResetCode(user1.id, "email");

            expect(newCode).toBeFalsy();
            expect(await passResetRepo.count()).toBe(1);
            const passReset = await passResetRepo.findOne();
            expect(passReset.code).toBe(oldCode);
        });
    });

    describe("verifyPassword()", () => {
        it("should throw error if user id param is falsy", async () => {
            await expect(() => sut.verifyPassword(null, "password")).rejects.toThrow(NullOrUndefinedException);
        });

        it("should return false if user does not exist", async () => {
            const result = await sut.verifyPassword("otherUser", "password");

            expect(result).toBe(false);
        });

        it("should return false if password does not match", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");
            const result = await sut.verifyPassword(user1.id, "otherPassword");

            expect(result).toBe(false);
        });

        it("should return true if password matches", async () => {
            await sut.create(new Credentials("user1@email.com", "user1", new Phone("+48", "1")), user1.id, "password");
            const result = await sut.verifyPassword(user1.id, "password");

            expect(result).toBe(true);
        });
    });
});
