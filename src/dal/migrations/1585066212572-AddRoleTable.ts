import {MigrationInterface, QueryRunner} from "typeorm";

export class AddRoleTable1585066212572 implements MigrationInterface {
    name = 'AddRoleTable1585066212572'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "role" ("userId" character varying NOT NULL, "role" character varying NOT NULL, CONSTRAINT "PK_3aadba006ba9534ff3c23319e56" PRIMARY KEY ("userId", "role"))`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "role"`, undefined);
    }

}
