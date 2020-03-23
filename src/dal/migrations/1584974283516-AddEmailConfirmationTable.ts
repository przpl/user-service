import {MigrationInterface, QueryRunner} from "typeorm";

export class AddEmailConfirmationTable1584974283516 implements MigrationInterface {
    name = 'AddEmailConfirmationTable1584974283516'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "email-confirmation" ("email" character varying NOT NULL, "userId" uuid NOT NULL, "code" character varying NOT NULL, "sentCount" smallint NOT NULL DEFAULT 0, "lastSendRequestAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c9c32e018265e47813bc024efcf" PRIMARY KEY ("email"))`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "email-confirmation"`, undefined);
    }

}
