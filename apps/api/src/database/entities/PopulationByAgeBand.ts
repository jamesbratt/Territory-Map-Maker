import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_POPULATION_GEOGRAPHY_CODE", ["geographyCode"])
@Index("IDX_POPULATION_DATE", ["date"])
@Entity({ name: "population_by_age_band" })
export class PopulationByAgeBand extends BaseAppEntity {
  @Column({ type: "int" })
  date!: number;

  @Column({ type: "varchar", length: 255 })
  geography!: string;

  @Column({ type: "varchar", length: 50, name: "geography_code" })
  geographyCode!: string;

  @Column({ type: "int" })
  total!: number;

  @Column({ type: "int", name: "under_18" })
  under18!: number;

  @Column({ type: "int", name: "age_18_24" })
  age1824!: number;

  @Column({ type: "int", name: "age_25_34" })
  age2534!: number;

  @Column({ type: "int", name: "age_35_44" })
  age3544!: number;

  @Column({ type: "int", name: "age_45_54" })
  age4554!: number;

  @Column({ type: "int", name: "age_55_64" })
  age5564!: number;

  @Column({ type: "int", name: "age_65_74" })
  age6574!: number;

  @Column({ type: "int", name: "age_75_plus" })
  age75Plus!: number;
}
