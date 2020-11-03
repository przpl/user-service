import {MigrationInterface, QueryRunner} from "typeorm";

export class Init1604426511555 implements MigrationInterface {
    name = 'Init1604426511555'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" character varying NOT NULL, "username" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "confirmation" ("subject" character varying NOT NULL, "userId" character varying NOT NULL, "code" character varying NOT NULL, "type" smallint NOT NULL, "sentCount" smallint NOT NULL DEFAULT 0, "lastSendRequestAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1ad9223c7afa72c4c484d36b28a" PRIMARY KEY ("subject"))`);
        await queryRunner.query(`CREATE TABLE "external-login" ("externalUserId" character varying NOT NULL, "provider" smallint NOT NULL, "userId" character varying NOT NULL, "email" character varying, CONSTRAINT "PK_9389ea09942ea0b6883445365f4" PRIMARY KEY ("externalUserId", "provider"))`);
        await queryRunner.query(`CREATE TABLE "local-login" ("userId" character varying NOT NULL, "username" character varying, "email" character varying, "emailConfirmed" boolean NOT NULL DEFAULT false, "phoneCode" character varying, "phoneNumber" character varying, "phoneConfirmed" boolean NOT NULL DEFAULT false, "passwordHash" character varying NOT NULL, CONSTRAINT "UQ_4d3649d6bfcce4413a378e39c54" UNIQUE ("username"), CONSTRAINT "UQ_636129349aa7b4d483f07838f05" UNIQUE ("email"), CONSTRAINT "REL_60523794271ca8bcaf8b541815" UNIQUE ("userId"), CONSTRAINT "PK_60523794271ca8bcaf8b5418155" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "lock" ("userId" character varying NOT NULL, "reason" character varying, "by" character varying, "until" TIMESTAMP NOT NULL, "at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_61bfb84bece9a15a97cafc2f2f" UNIQUE ("userId"), CONSTRAINT "PK_61bfb84bece9a15a97cafc2f2fa" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "mfa" ("userId" character varying NOT NULL, "method" smallint NOT NULL, "enabled" boolean NOT NULL DEFAULT false, "secret" character varying NOT NULL, "ip" character varying NOT NULL, "invalidAttempts" integer NOT NULL DEFAULT 0, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_e114d31b2c228a8291db8cbf47" UNIQUE ("userId"), CONSTRAINT "PK_e114d31b2c228a8291db8cbf474" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "password-reset" ("userId" character varying NOT NULL, "code" character varying NOT NULL, "method" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_db45a9bc4faa806148d698e1ed" UNIQUE ("userId"), CONSTRAINT "PK_db45a9bc4faa806148d698e1edd" PRIMARY KEY ("userId"))`);
        await queryRunner.query(`CREATE TABLE "role" ("userId" character varying NOT NULL, "role" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3aadba006ba9534ff3c23319e56" PRIMARY KEY ("userId", "role"))`);
        await queryRunner.query(`CREATE TABLE "session" ("token" character varying NOT NULL, "userId" character varying NOT NULL, "createIp" character varying NOT NULL, "lastRefreshIp" character varying NOT NULL, "browser" character varying, "os" character varying, "osVersion" character varying, "lastUseAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_232f8e85d7633bd6ddfad421696" PRIMARY KEY ("token"))`);
        await queryRunner.query(`ALTER TABLE "confirmation" ADD CONSTRAINT "FK_74f1ebea7c18510697c0e2a6be4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "external-login" ADD CONSTRAINT "FK_fdb688ff063cbce7a742818ad14" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "local-login" ADD CONSTRAINT "FK_60523794271ca8bcaf8b5418155" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lock" ADD CONSTRAINT "FK_61bfb84bece9a15a97cafc2f2fa" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mfa" ADD CONSTRAINT "FK_e114d31b2c228a8291db8cbf474" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password-reset" ADD CONSTRAINT "FK_db45a9bc4faa806148d698e1edd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role" ADD CONSTRAINT "FK_3e02d32dd4707c91433de0390ea" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "FK_3d2f174ef04fb312fdebd0ddc53"`);
        await queryRunner.query(`ALTER TABLE "role" DROP CONSTRAINT "FK_3e02d32dd4707c91433de0390ea"`);
        await queryRunner.query(`ALTER TABLE "password-reset" DROP CONSTRAINT "FK_db45a9bc4faa806148d698e1edd"`);
        await queryRunner.query(`ALTER TABLE "mfa" DROP CONSTRAINT "FK_e114d31b2c228a8291db8cbf474"`);
        await queryRunner.query(`ALTER TABLE "lock" DROP CONSTRAINT "FK_61bfb84bece9a15a97cafc2f2fa"`);
        await queryRunner.query(`ALTER TABLE "local-login" DROP CONSTRAINT "FK_60523794271ca8bcaf8b5418155"`);
        await queryRunner.query(`ALTER TABLE "external-login" DROP CONSTRAINT "FK_fdb688ff063cbce7a742818ad14"`);
        await queryRunner.query(`ALTER TABLE "confirmation" DROP CONSTRAINT "FK_74f1ebea7c18510697c0e2a6be4"`);
        await queryRunner.query(`DROP TABLE "session"`);
        await queryRunner.query(`DROP TABLE "role"`);
        await queryRunner.query(`DROP TABLE "password-reset"`);
        await queryRunner.query(`DROP TABLE "mfa"`);
        await queryRunner.query(`DROP TABLE "lock"`);
        await queryRunner.query(`DROP TABLE "local-login"`);
        await queryRunner.query(`DROP TABLE "external-login"`);
        await queryRunner.query(`DROP TABLE "confirmation"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
