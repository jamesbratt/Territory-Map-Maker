import { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexDistrictLookup1785800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "IDX_POSTCODE_DISTRICT_NORMALIZED" ON postcodelookup
      ((left(regexp_replace(upper(pcd7), '[[:space:]]', '', 'g'),
        greatest(length(regexp_replace(upper(pcd7), '[[:space:]]', '', 'g')) - 3, 0))))`);
    await queryRunner.query(`CREATE INDEX "IDX_POSTCODE_LSOA_NORMALIZED" ON postcodelookup
      ((NULLIF(trim(lsoa21cd), '')))`);
    await queryRunner.query('ANALYZE postcodelookup');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_POSTCODE_LSOA_NORMALIZED"');
    await queryRunner.query('DROP INDEX "IDX_POSTCODE_DISTRICT_NORMALIZED"');
  }
}
