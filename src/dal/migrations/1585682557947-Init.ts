import {MigrationInterface, QueryRunner} from "typeorm";

export class Init1585682557947 implements MigrationInterface {
    name = 'Init1585682557947'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" character varying NOT NULL, "activeSessions" smallint NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "email-confirmation" ("email" character varying NOT NULL, "userId" character varying NOT NULL, "code" character varying NOT NULL, "sentCount" smallint NOT NULL DEFAULT 0, "lastSendRequestAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_d5a66157871a895e1579e86bc9" UNIQUE ("userId"), CONSTRAINT "PK_c9c32e018265e47813bc024efcf" PRIMARY KEY ("email"))`, undefined);
        await queryRunner.query(`CREATE TABLE "external-login" ("externalUserId" character varying NOT NULL, "userId" character varying NOT NULL, "provider" smallint NOT NULL, "email" character varying, CONSTRAINT "REL_fdb688ff063cbce7a742818ad1" UNIQUE ("userId"), CONSTRAINT "PK_e29f9c053191f056b2ab61f66a9" PRIMARY KEY ("externalUserId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "local-login" ("userId" character varying NOT NULL, "email" character varying, "emailConfirmed" boolean NOT NULL DEFAULT false, "username" character varying, "phoneCode" character varying, "phoneNumber" character varying, "phoneConfirmed" boolean NOT NULL DEFAULT false, "passwordHash" character varying, CONSTRAINT "UQ_636129349aa7b4d483f07838f05" UNIQUE ("email"), CONSTRAINT "UQ_4d3649d6bfcce4413a378e39c54" UNIQUE ("username"), CONSTRAINT "REL_60523794271ca8bcaf8b541815" UNIQUE ("userId"), CONSTRAINT "PK_60523794271ca8bcaf8b5418155" PRIMARY KEY ("userId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "lock" ("userId" character varying NOT NULL, "reason" character varying, "until" TIMESTAMP, "at" TIMESTAMP NOT NULL DEFAULT now(), "by" character varying NOT NULL, CONSTRAINT "REL_61bfb84bece9a15a97cafc2f2f" UNIQUE ("userId"), CONSTRAINT "PK_61bfb84bece9a15a97cafc2f2fa" PRIMARY KEY ("userId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "mfa" ("userId" character varying NOT NULL, "method" smallint NOT NULL, "enabled" boolean NOT NULL DEFAULT false, "secret" character varying NOT NULL, "ip" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_e114d31b2c228a8291db8cbf47" UNIQUE ("userId"), CONSTRAINT "PK_e114d31b2c228a8291db8cbf474" PRIMARY KEY ("userId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "password-reset" ("userId" character varying NOT NULL, "code" character varying NOT NULL, "method" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_db45a9bc4faa806148d698e1ed" UNIQUE ("userId"), CONSTRAINT "PK_db45a9bc4faa806148d698e1edd" PRIMARY KEY ("userId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "role" ("userId" character varying NOT NULL, "role" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_3e02d32dd4707c91433de0390e" UNIQUE ("userId"), CONSTRAINT "PK_3aadba006ba9534ff3c23319e56" PRIMARY KEY ("userId", "role"))`, undefined);
        await queryRunner.query(`CREATE TABLE "session" ("token" character varying NOT NULL, "userId" character varying NOT NULL, "createIp" character varying NOT NULL, "lastRefreshIp" character varying NOT NULL, "browser" character varying, "os" character varying, "osVersion" character varying, "lastUseAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_3d2f174ef04fb312fdebd0ddc5" UNIQUE ("userId"), CONSTRAINT "PK_232f8e85d7633bd6ddfad421696" PRIMARY KEY ("token"))`, undefined);
        await queryRunner.query(`ALTER TABLE "email-confirmation" ADD CONSTRAINT "FK_d5a66157871a895e1579e86bc97" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "external-login" ADD CONSTRAINT "FK_fdb688ff063cbce7a742818ad14" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "local-login" ADD CONSTRAINT "FK_60523794271ca8bcaf8b5418155" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "lock" ADD CONSTRAINT "FK_61bfb84bece9a15a97cafc2f2fa" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "mfa" ADD CONSTRAINT "FK_e114d31b2c228a8291db8cbf474" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "password-reset" ADD CONSTRAINT "FK_db45a9bc4faa806148d698e1edd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "role" ADD CONSTRAINT "FK_3e02d32dd4707c91433de0390ea" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53"`, undefined);
        await queryRunner.query(`ALTER TABLE "role" DROP CONSTRAINT "FK_3e02d32dd4707c91433de0390ea"`, undefined);
        await queryRunner.query(`ALTER TABLE "password-reset" DROP CONSTRAINT "FK_db45a9bc4faa806148d698e1edd"`, undefined);
        await queryRunner.query(`ALTER TABLE "mfa" DROP CONSTRAINT "FK_e114d31b2c228a8291db8cbf474"`, undefined);
        await queryRunner.query(`ALTER TABLE "lock" DROP CONSTRAINT "FK_61bfb84bece9a15a97cafc2f2fa"`, undefined);
        await queryRunner.query(`ALTER TABLE "local-login" DROP CONSTRAINT "FK_60523794271ca8bcaf8b5418155"`, undefined);
        await queryRunner.query(`ALTER TABLE "external-login" DROP CONSTRAINT "FK_fdb688ff063cbce7a742818ad14"`, undefined);
        await queryRunner.query(`ALTER TABLE "email-confirmation" DROP CONSTRAINT "FK_d5a66157871a895e1579e86bc97"`, undefined);
        await queryRunner.query(`DROP TABLE "session"`, undefined);
        await queryRunner.query(`DROP TABLE "role"`, undefined);
        await queryRunner.query(`DROP TABLE "password-reset"`, undefined);
        await queryRunner.query(`DROP TABLE "mfa"`, undefined);
        await queryRunner.query(`DROP TABLE "lock"`, undefined);
        await queryRunner.query(`DROP TABLE "local-login"`, undefined);
        await queryRunner.query(`DROP TABLE "external-login"`, undefined);
        await queryRunner.query(`DROP TABLE "email-confirmation"`, undefined);
        await queryRunner.query(`DROP TABLE "user"`, undefined);
    }

}
