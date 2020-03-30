import {MigrationInterface, QueryRunner} from "typeorm";

export class AddMethodColumnToTable1585569641154 implements MigrationInterface {
    name = 'AddMethodColumnToTable1585569641154'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password-reset" ADD "method" integer NOT NULL`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password-reset" DROP COLUMN "method"`, undefined);
    }

}
