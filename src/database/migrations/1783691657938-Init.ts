import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1783691657938 implements MigrationInterface {
    name = 'Init1783691657938'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "population_by_age_band" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "date" integer NOT NULL, "geography" character varying(255) NOT NULL, "geography_code" character varying(50) NOT NULL, "total" integer NOT NULL, "under_18" integer NOT NULL, "age_18_24" integer NOT NULL, "age_25_34" integer NOT NULL, "age_35_44" integer NOT NULL, "age_45_54" integer NOT NULL, "age_55_64" integer NOT NULL, "age_65_74" integer NOT NULL, "age_75_plus" integer NOT NULL, CONSTRAINT "PK_17f113f7eadafa4ffa52e7607fd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_POPULATION_DATE" ON "population_by_age_band" ("date") `);
        await queryRunner.query(`CREATE INDEX "IDX_POPULATION_GEOGRAPHY_CODE" ON "population_by_age_band" ("geography_code") `);
        await queryRunner.query(`CREATE TABLE "postcodelookup" ("id" SERIAL NOT NULL, "pcd7" character varying(150) NOT NULL, "lad25cd" character varying(150) NOT NULL, "wd25cd" character varying(150) NOT NULL, "lat" character varying(150) NOT NULL, "long" character varying(150) NOT NULL, "lsoa21cd" character varying(150) NOT NULL, CONSTRAINT "PK_d4bcc9c3bf9355a55a9f87393ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_UPLOAD_PCD7" ON "postcodelookup" ("pcd7") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_UPLOAD_PCD7"`);
        await queryRunner.query(`DROP TABLE "postcodelookup"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_POPULATION_GEOGRAPHY_CODE"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_POPULATION_DATE"`);
        await queryRunner.query(`DROP TABLE "population_by_age_band"`);
    }

}
