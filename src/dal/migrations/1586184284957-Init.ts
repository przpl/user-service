import {MigrationInterface, QueryRunner} from "typeorm";

export class Init1586184284957 implements MigrationInterface {
    name = 'Init1586184284957'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "local-login" DROP CONSTRAINT "FK_60523794271ca8bcaf8b5418155"`, undefined);
        await queryRunner.query(`ALTER TABLE "local-login" ADD CONSTRAINT "UQ_60523794271ca8bcaf8b5418155" UNIQUE ("userId")`, undefined);
        await queryRunner.query(`ALTER TABLE "lock" DROP CONSTRAINT "FK_61bfb84bece9a15a97cafc2f2fa"`, undefined);
        await queryRunner.query(`ALTER TABLE "lock" ADD CONSTRAINT "UQ_61bfb84bece9a15a97cafc2f2fa" UNIQUE ("userId")`, undefined);
        await queryRunner.query(`ALTER TABLE "mfa" DROP CONSTRAINT "FK_e114d31b2c228a8291db8cbf474"`, undefined);
        await queryRunner.query(`ALTER TABLE "mfa" ADD CONSTRAINT "UQ_e114d31b2c228a8291db8cbf474" UNIQUE ("userId")`, undefined);
        await queryRunner.query(`ALTER TABLE "password-reset" DROP CONSTRAINT "FK_db45a9bc4faa806148d698e1edd"`, undefined);
        await queryRunner.query(`ALTER TABLE "password-reset" ADD CONSTRAINT "UQ_db45a9bc4faa806148d698e1edd" UNIQUE ("userId")`, undefined);
        await queryRunner.query(`ALTER TABLE "local-login" ADD CONSTRAINT "FK_60523794271ca8bcaf8b5418155" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "lock" ADD CONSTRAINT "FK_61bfb84bece9a15a97cafc2f2fa" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "mfa" ADD CONSTRAINT "FK_e114d31b2c228a8291db8cbf474" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "password-reset" ADD CONSTRAINT "FK_db45a9bc4faa806148d698e1edd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "password-reset" DROP CONSTRAINT "FK_db45a9bc4faa806148d698e1edd"`, undefined);
        await queryRunner.query(`ALTER TABLE "mfa" DROP CONSTRAINT "FK_e114d31b2c228a8291db8cbf474"`, undefined);
        await queryRunner.query(`ALTER TABLE "lock" DROP CONSTRAINT "FK_61bfb84bece9a15a97cafc2f2fa"`, undefined);
        await queryRunner.query(`ALTER TABLE "local-login" DROP CONSTRAINT "FK_60523794271ca8bcaf8b5418155"`, undefined);
        await queryRunner.query(`ALTER TABLE "password-reset" DROP CONSTRAINT "UQ_db45a9bc4faa806148d698e1edd"`, undefined);
        await queryRunner.query(`ALTER TABLE "password-reset" ADD CONSTRAINT "FK_db45a9bc4faa806148d698e1edd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "mfa" DROP CONSTRAINT "UQ_e114d31b2c228a8291db8cbf474"`, undefined);
        await queryRunner.query(`ALTER TABLE "mfa" ADD CONSTRAINT "FK_e114d31b2c228a8291db8cbf474" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "lock" DROP CONSTRAINT "UQ_61bfb84bece9a15a97cafc2f2fa"`, undefined);
        await queryRunner.query(`ALTER TABLE "lock" ADD CONSTRAINT "FK_61bfb84bece9a15a97cafc2f2fa" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "local-login" DROP CONSTRAINT "UQ_60523794271ca8bcaf8b5418155"`, undefined);
        await queryRunner.query(`ALTER TABLE "local-login" ADD CONSTRAINT "FK_60523794271ca8bcaf8b5418155" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
    }

}
