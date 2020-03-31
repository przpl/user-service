import {MigrationInterface, QueryRunner} from "typeorm";

export class Init1585665665620 implements MigrationInterface {
    name = 'Init1585665665620'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email-confirmation" ("email" character varying NOT NULL, "userId" character varying NOT NULL, "code" character varying NOT NULL, "sentCount" smallint NOT NULL DEFAULT 0, "lastSendRequestAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c9c32e018265e47813bc024efcf" PRIMARY KEY ("email"))`, undefined);
        await queryRunner.query(`CREATE TABLE "user" ("id" character varying NOT NULL, "activeSessions" smallint NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "external-login" ("externalUserId" character varying NOT NULL, "userId" character varying, "provider" smallint NOT NULL, "email" character varying, CONSTRAINT "PK_e29f9c053191f056b2ab61f66a9" PRIMARY KEY ("externalUserId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "local-login" ("id" SERIAL NOT NULL, "userId" character varying, "email" character varying, "emailConfirmed" boolean NOT NULL DEFAULT false, "username" character varying, "phoneCode" character varying, "phoneNumber" character varying, "phoneConfirmed" boolean NOT NULL DEFAULT false, "passwordHash" character varying, CONSTRAINT "UQ_636129349aa7b4d483f07838f05" UNIQUE ("email"), CONSTRAINT "UQ_4d3649d6bfcce4413a378e39c54" UNIQUE ("username"), CONSTRAINT "PK_26e77d6df53ed66d5cb80802f2e" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "lock" ("id" SERIAL NOT NULL, "userId" character varying, "reason" character varying, "until" TIMESTAMP, "at" TIMESTAMP NOT NULL DEFAULT now(), "by" character varying NOT NULL, CONSTRAINT "PK_b47095fc0260d85601062b8ed1d" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "mfa" ("id" SERIAL NOT NULL, "userId" character varying, "method" smallint NOT NULL, "enabled" boolean NOT NULL DEFAULT false, "secret" character varying NOT NULL, "ip" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f4e180ccc1f351057978f46d458" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "password-reset" ("userId" character varying NOT NULL, "code" character varying NOT NULL, "method" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_db45a9bc4faa806148d698e1edd" PRIMARY KEY ("userId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "role" ("userId" character varying NOT NULL, "role" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3aadba006ba9534ff3c23319e56" PRIMARY KEY ("userId", "role"))`, undefined);
        await queryRunner.query(`CREATE TABLE "session" ("token" character varying NOT NULL, "userId" character varying NOT NULL, "createIp" character varying NOT NULL, "lastRefreshIp" character varying NOT NULL, "browser" character varying, "os" character varying, "osVersion" character varying, "lastUseAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_232f8e85d7633bd6ddfad421696" PRIMARY KEY ("token"))`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "session"`, undefined);
        await queryRunner.query(`DROP TABLE "role"`, undefined);
        await queryRunner.query(`DROP TABLE "password-reset"`, undefined);
        await queryRunner.query(`DROP TABLE "mfa"`, undefined);
        await queryRunner.query(`DROP TABLE "lock"`, undefined);
        await queryRunner.query(`DROP TABLE "local-login"`, undefined);
        await queryRunner.query(`DROP TABLE "external-login"`, undefined);
        await queryRunner.query(`DROP TABLE "user"`, undefined);
        await queryRunner.query(`DROP TABLE "email-confirmation"`, undefined);
    }

}
