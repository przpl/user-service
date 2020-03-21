import {MigrationInterface, QueryRunner} from "typeorm";

export class AddActiveSessionsColumn1584800677699 implements MigrationInterface {
    name = 'AddActiveSessionsColumn1584800677699'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "activeSessions" smallint NOT NULL DEFAULT 0`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "activeSessions"`, undefined);
    }

}
