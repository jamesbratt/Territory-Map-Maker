import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1785509779941 implements MigrationInterface {
  name = "Init1785509779941";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "household_income" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "msoa21cd" character varying(9) NOT NULL, "annual_income_before_costs" double precision NOT NULL, "annual_income_after_costs" double precision NOT NULL, CONSTRAINT "PK_0ac2c7291703b25a5bea580360e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_HOUSEHOLD_INCOME_MSOA21CD" ON "household_income" ("msoa21cd") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_HOUSEHOLD_INCOME_MSOA21CD"`,
    );
    await queryRunner.query(`DROP TABLE "household_income"`);
  }
}
