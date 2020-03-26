import {MigrationInterface, QueryRunner} from "typeorm";

export class AddEmailToExternalLoginTable1585211913911 implements MigrationInterface {
    name = 'AddEmailToExternalLoginTable1585211913911'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "external-login" ADD "email" character varying`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "external-login" DROP COLUMN "email"`, undefined);
    }

}
