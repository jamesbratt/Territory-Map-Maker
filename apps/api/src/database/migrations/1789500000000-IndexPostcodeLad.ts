import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexPostcodeLad1789500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX "IDX_POSTCODE_LAD" ON "postcodelookup" ("lad25cd")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_POSTCODE_LAD"');
  }
}
