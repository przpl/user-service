import {MigrationInterface, QueryRunner} from "typeorm";

export class Init1584794778320 implements MigrationInterface {
    name = 'Init1584794778320'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "external-login" ("externalUserId" character varying NOT NULL, "provider" smallint NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e29f9c053191f056b2ab61f66a9" PRIMARY KEY ("externalUserId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "password-reset" ("userId" character varying NOT NULL, "code" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_db45a9bc4faa806148d698e1edd" PRIMARY KEY ("userId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "session" ("token" character varying NOT NULL, "userId" character varying NOT NULL, "lastUseAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_232f8e85d7633bd6ddfad421696" PRIMARY KEY ("token"))`, undefined);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying, "passwordHash" character varying, "emailConfirmed" boolean NOT NULL DEFAULT false, "mfaMethod" smallint NOT NULL DEFAULT 0, "mfaSecret" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user"`, undefined);
        await queryRunner.query(`DROP TABLE "session"`, undefined);
        await queryRunner.query(`DROP TABLE "password-reset"`, undefined);
        await queryRunner.query(`DROP TABLE "external-login"`, undefined);
    }

}
