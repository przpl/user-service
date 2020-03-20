import {MigrationInterface, QueryRunner} from "typeorm";

export class RemoveUUID1584740129737 implements MigrationInterface {
    name = 'RemoveUUID1584740129737'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "PK_232f8e85d7633bd6ddfad421696"`, undefined);
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "token"`, undefined);
        await queryRunner.query(`ALTER TABLE "session" ADD "token" character varying NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "PK_232f8e85d7633bd6ddfad421696" PRIMARY KEY ("token")`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "session" DROP CONSTRAINT "PK_232f8e85d7633bd6ddfad421696"`, undefined);
        await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "token"`, undefined);
        await queryRunner.query(`ALTER TABLE "session" ADD "token" uuid NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "session" ADD CONSTRAINT "PK_232f8e85d7633bd6ddfad421696" PRIMARY KEY ("token")`, undefined);
    }

}
