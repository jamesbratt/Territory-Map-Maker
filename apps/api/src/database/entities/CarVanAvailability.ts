import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_CAR_VAN_AVAILABILITY_GEOGRAPHY_CODE", ["geographyCode"])
@Index("IDX_CAR_VAN_AVAILABILITY_DATE", ["date"])
@Entity({ name: "car_van_availability" })
export class CarVanAvailability extends BaseAppEntity {
  @Column({ type: "int" })
  date!: number;

  @Column({ type: "varchar", length: 255 })
  geography!: string;

  @Column({ type: "varchar", length: 50, name: "geography_code" })
  geographyCode!: string;

  @Column({ type: "int", name: "households_total" })
  householdsTotal!: number;

  @Column({ type: "int", name: "no_cars_or_vans" })
  noCarsOrVans!: number;

  @Column({ type: "int", name: "one_car_or_van" })
  oneCarOrVan!: number;

  @Column({ type: "int", name: "two_cars_or_vans" })
  twoCarsOrVans!: number;

  @Column({ type: "int", name: "three_plus_cars_or_vans" })
  threePlusCarsOrVans!: number;
}
