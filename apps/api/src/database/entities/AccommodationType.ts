import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_ACCOMMODATION_TYPE_GEOGRAPHY_CODE", ["geographyCode"])
@Index("IDX_ACCOMMODATION_TYPE_DATE", ["date"])
@Entity({ name: "accommodation_type" })
export class AccommodationType extends BaseAppEntity {
  @Column({ type: "int" })
  date!: number;

  @Column({ type: "varchar", length: 255 })
  geography!: string;

  @Column({ type: "varchar", length: 50, name: "geography_code" })
  geographyCode!: string;

  @Column({ type: "int", name: "households_total" })
  householdsTotal!: number;

  @Column({ type: "int" })
  detached!: number;

  @Column({ type: "int", name: "semi_detached" })
  semiDetached!: number;

  @Column({ type: "int" })
  terraced!: number;

  @Column({ type: "int", name: "purpose_built_flat" })
  purposeBuiltFlat!: number;

  @Column({ type: "int", name: "converted_or_shared_house" })
  convertedOrSharedHouse!: number;

  @Column({ type: "int", name: "converted_building" })
  convertedBuilding!: number;

  @Column({ type: "int", name: "commercial_building" })
  commercialBuilding!: number;

  @Column({ type: "int", name: "caravan_or_mobile_structure" })
  caravanOrMobileStructure!: number;
}
