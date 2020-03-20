import {MigrationInterface, QueryRunner} from "typeorm";

export class AddSessionTable1584739827062 implements MigrationInterface {
    name = 'AddSessionTable1584739827062'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "session" ("token" uuid NOT NULL, "userId" character varying NOT NULL, "lastUseAt" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_232f8e85d7633bd6ddfad421696" PRIMARY KEY ("token"))`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "session"`, undefined);
    }

}
