import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_OCCUPATION_GEOGRAPHY_CODE", ["geographyCode"])
@Index("IDX_OCCUPATION_DATE", ["date"])
@Entity({ name: "occupation_by_category" })
export class OccupationByCategory extends BaseAppEntity {
  @Column({ type: "int" })
  date!: number;

  @Column({ type: "varchar", length: 255 })
  geography!: string;

  @Column({ type: "varchar", length: 50, name: "geography_code" })
  geographyCode!: string;

  @Column({ type: "int", name: "occ_total" })
  occTotal!: number;

  @Column({ type: "int", name: "occ_1_managers" })
  occ1Managers!: number;

  @Column({ type: "int", name: "occ_2_professional" })
  occ2Professional!: number;

  @Column({ type: "int", name: "occ_3_associate" })
  occ3Associate!: number;

  @Column({ type: "int", name: "occ_4_administrative" })
  occ4Administrative!: number;

  @Column({ type: "int", name: "occ_5_skilled" })
  occ5Skilled!: number;

  @Column({ type: "int", name: "occ_6_caring" })
  occ6Caring!: number;

  @Column({ type: "int", name: "occ_7_sales" })
  occ7Sales!: number;

  @Column({ type: "int", name: "occ_8_process" })
  occ8Process!: number;

  @Column({ type: "int", name: "occ_9_elementary" })
  occ9Elementary!: number;
}
