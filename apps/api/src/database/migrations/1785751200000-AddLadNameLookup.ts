import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLadNameLookup1785751200000 implements MigrationInterface {
  name = "AddLadNameLookup1785751200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "lad_name_lookup" ("id" SERIAL NOT NULL, "lad25cd" character varying(150) NOT NULL, "lad25nm" character varying(150) NOT NULL, CONSTRAINT "PK_lad_name_lookup" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "lad_name_lookup"`);
  }
}
