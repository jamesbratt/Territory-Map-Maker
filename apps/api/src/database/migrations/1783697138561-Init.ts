import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1783697138561 implements MigrationInterface {
    name = 'Init1783697138561'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "occupation_by_category" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "date" integer NOT NULL, "geography" character varying(255) NOT NULL, "geography_code" character varying(50) NOT NULL, "occ_total" integer NOT NULL, "occ_1_managers" integer NOT NULL, "occ_2_professional" integer NOT NULL, "occ_3_associate" integer NOT NULL, "occ_4_administrative" integer NOT NULL, "occ_5_skilled" integer NOT NULL, "occ_6_caring" integer NOT NULL, "occ_7_sales" integer NOT NULL, "occ_8_process" integer NOT NULL, "occ_9_elementary" integer NOT NULL, CONSTRAINT "PK_574e1e0ef9b7f27c633b3b26669" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_OCCUPATION_DATE" ON "occupation_by_category" ("date") `);
        await queryRunner.query(`CREATE INDEX "IDX_OCCUPATION_GEOGRAPHY_CODE" ON "occupation_by_category" ("geography_code") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_OCCUPATION_GEOGRAPHY_CODE"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_OCCUPATION_DATE"`);
        await queryRunner.query(`DROP TABLE "occupation_by_category"`);
    }

}
