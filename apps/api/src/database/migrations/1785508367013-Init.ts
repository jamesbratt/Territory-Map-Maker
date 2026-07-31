import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1785508367013 implements MigrationInterface {
  name = "Init1785508367013";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "postcodelookup" ADD "msoa21cd" character varying(150)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "postcodelookup" DROP COLUMN "msoa21cd"`,
    );
  }
}
