import {MigrationInterface, QueryRunner} from "typeorm";

export class Init1585499769229 implements MigrationInterface {
    name = 'Init1585499769229'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email-confirmation" ("email" character varying NOT NULL, "userId" character varying NOT NULL, "code" character varying NOT NULL, "sentCount" smallint NOT NULL DEFAULT 0, "lastSendRequestAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c9c32e018265e47813bc024efcf" PRIMARY KEY ("email"))`, undefined);
        await queryRunner.query(`CREATE TABLE "external-login" ("externalUserId" character varying NOT NULL, "provider" smallint NOT NULL, "email" character varying, "userId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e29f9c053191f056b2ab61f66a9" PRIMARY KEY ("externalUserId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "password-reset" ("userId" character varying NOT NULL, "code" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_db45a9bc4faa806148d698e1edd" PRIMARY KEY ("userId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "role" ("userId" character varying NOT NULL, "role" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3aadba006ba9534ff3c23319e56" PRIMARY KEY ("userId", "role"))`, undefined);
        await queryRunner.query(`CREATE TABLE "session" ("token" character varying NOT NULL, "userId" character varying NOT NULL, "createIp" character varying NOT NULL, "lastRefreshIp" character varying NOT NULL, "browser" character varying, "os" character varying, "osVersion" character varying, "lastUseAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_232f8e85d7633bd6ddfad421696" PRIMARY KEY ("token"))`, undefined);
        await queryRunner.query(`CREATE TABLE "user" ("id" character varying NOT NULL, "email" character varying, "username" character varying, "phoneCode" character varying, "phoneNumber" character varying, "passwordHash" character varying, "emailConfirmed" boolean NOT NULL DEFAULT false, "mfaMethod" smallint NOT NULL DEFAULT 0, "mfaSecret" character varying, "activeSessions" smallint NOT NULL DEFAULT 0, "lockReason" character varying, "lockedUntil" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`, undefined);
        await queryRunner.query(`DROP TABLE "session"`, undefined);
        await queryRunner.query(`DROP TABLE "role"`, undefined);
        await queryRunner.query(`DROP TABLE "password-reset"`, undefined);
        await queryRunner.query(`DROP TABLE "external-login"`, undefined);
        await queryRunner.query(`DROP TABLE "email-confirmation"`, undefined);
    }

}
