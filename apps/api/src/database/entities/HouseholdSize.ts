import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_HOUSEHOLD_SIZE_GEOGRAPHY_CODE", ["geographyCode"])
@Index("IDX_HOUSEHOLD_SIZE_DATE", ["date"])
@Entity({ name: "household_size" })
export class HouseholdSize extends BaseAppEntity {
  @Column({ type: "int" })
  date!: number;

  @Column({ type: "varchar", length: 255 })
  geography!: string;

  @Column({ type: "varchar", length: 50, name: "geography_code" })
  geographyCode!: string;

  @Column({ type: "int", name: "household_spaces_total" })
  householdSpacesTotal!: number;

  @Column({ type: "int", name: "household_size_0" })
  householdSize0!: number;

  @Column({ type: "int", name: "household_size_1" })
  householdSize1!: number;

  @Column({ type: "int", name: "household_size_2" })
  householdSize2!: number;

  @Column({ type: "int", name: "household_size_3" })
  householdSize3!: number;

  @Column({ type: "int", name: "household_size_4" })
  householdSize4!: number;

  @Column({ type: "int", name: "household_size_5" })
  householdSize5!: number;

  @Column({ type: "int", name: "household_size_6" })
  householdSize6!: number;

  @Column({ type: "int", name: "household_size_7" })
  householdSize7!: number;

  @Column({ type: "int", name: "household_size_8plus" })
  householdSize8Plus!: number;
}
