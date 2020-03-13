import {MigrationInterface, QueryRunner} from "typeorm";

export class AddExternalLoginTable1584096521981 implements MigrationInterface {
    name = 'AddExternalLoginTable1584096521981'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "external-login_provider_enum" AS ENUM('0', '1')`, undefined);
        await queryRunner.query(`CREATE TABLE "external-login" ("externalUserId" character varying NOT NULL, "provider" "external-login_provider_enum" NOT NULL, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9389ea09942ea0b6883445365f4" PRIMARY KEY ("externalUserId", "provider"))`, undefined);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "passwordHash" DROP NOT NULL`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "passwordHash" SET NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "email" SET NOT NULL`, undefined);
        await queryRunner.query(`DROP TABLE "external-login"`, undefined);
        await queryRunner.query(`DROP TYPE "external-login_provider_enum"`, undefined);
    }

}
