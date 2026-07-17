import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_HOUSEHOLD_TENURE_GEOGRAPHY_CODE", ["geographyCode"])
@Index("IDX_HOUSEHOLD_TENURE_DATE", ["date"])
@Entity({ name: "household_tenure" })
export class HouseholdTenure extends BaseAppEntity {
  @Column({ type: "int" })
  date!: number;

  @Column({ type: "varchar", length: 255 })
  geography!: string;

  @Column({ type: "varchar", length: 50, name: "geography_code" })
  geographyCode!: string;

  @Column({ type: "int", name: "households_total" })
  householdsTotal!: number;

  @Column({ type: "int", name: "owned_total" })
  ownedTotal!: number;

  @Column({ type: "int", name: "owned_outright" })
  ownedOutright!: number;

  @Column({ type: "int", name: "owned_mortgage_or_loan" })
  ownedMortgageOrLoan!: number;

  @Column({ type: "int", name: "shared_ownership_total" })
  sharedOwnershipTotal!: number;

  @Column({ type: "int", name: "shared_ownership" })
  sharedOwnership!: number;

  @Column({ type: "int", name: "social_rented_total" })
  socialRentedTotal!: number;

  @Column({ type: "int", name: "social_rented_council_or_la" })
  socialRentedCouncilOrLa!: number;

  @Column({ type: "int", name: "social_rented_other" })
  socialRentedOther!: number;

  @Column({ type: "int", name: "private_rented_total" })
  privateRentedTotal!: number;

  @Column({ type: "int", name: "private_rented_landlord_or_agency" })
  privateRentedLandlordOrAgency!: number;

  @Column({ type: "int", name: "private_rented_other" })
  privateRentedOther!: number;

  @Column({ type: "int", name: "lives_rent_free" })
  livesRentFree!: number;
}
