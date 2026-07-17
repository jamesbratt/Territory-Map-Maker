import { Column, Entity, Index } from "typeorm";
import { BaseAppEntity } from "./BaseAppEntity";

@Index("IDX_HOUSEHOLD_COMPOSITION_GEOGRAPHY_CODE", ["geographyCode"])
@Index("IDX_HOUSEHOLD_COMPOSITION_DATE", ["date"])
@Entity({ name: "household_composition" })
export class HouseholdComposition extends BaseAppEntity {
  @Column({ type: "int" })
  date!: number;

  @Column({ type: "varchar", length: 255 })
  geography!: string;

  @Column({ type: "varchar", length: 50, name: "geography_code" })
  geographyCode!: string;

  @Column({ type: "int", name: "total_households" })
  totalHouseholds!: number;

  @Column({ type: "int", name: "one_person_household" })
  onePersonHousehold!: number;

  @Column({ type: "int", name: "one_person_household_aged_66_plus" })
  onePersonHouseholdAged66Plus!: number;

  @Column({ type: "int", name: "one_person_household_other" })
  onePersonHouseholdOther!: number;

  @Column({ type: "int", name: "single_family_household" })
  singleFamilyHousehold!: number;

  @Column({ type: "int", name: "single_family_household_all_aged_66_plus" })
  singleFamilyHouseholdAllAged66Plus!: number;

  @Column({
    type: "int",
    name: "single_family_household_married_civil_partnership",
  })
  singleFamilyHouseholdMarriedCivilPartnership!: number;

  @Column({
    type: "int",
    name: "single_family_household_married_civil_partnership_no_children",
  })
  singleFamilyHouseholdMarriedCivilPartnershipNoChildren!: number;

  @Column({
    type: "int",
    name: "single_family_household_married_civil_partnership_dependent_children",
  })
  singleFamilyHouseholdMarriedCivilPartnershipDependentChildren!: number;

  @Column({
    type: "int",
    name: "single_family_household_married_civil_partnership_non_dependent_children",
  })
  singleFamilyHouseholdMarriedCivilPartnershipNonDependentChildren!: number;

  @Column({ type: "int", name: "single_family_household_cohabiting_couple" })
  singleFamilyHouseholdCohabitingCouple!: number;

  @Column({
    type: "int",
    name: "single_family_household_cohabiting_couple_no_children",
  })
  singleFamilyHouseholdCohabitingCoupleNoChildren!: number;

  @Column({
    type: "int",
    name: "single_family_household_cohabiting_couple_dependent_children",
  })
  singleFamilyHouseholdCohabitingCoupleDependentChildren!: number;

  @Column({
    type: "int",
    name: "single_family_household_cohabiting_couple_non_dependent_children",
  })
  singleFamilyHouseholdCohabitingCoupleNonDependentChildren!: number;

  @Column({ type: "int", name: "single_family_household_lone_parent" })
  singleFamilyHouseholdLoneParent!: number;

  @Column({
    type: "int",
    name: "single_family_household_lone_parent_dependent_children",
  })
  singleFamilyHouseholdLoneParentDependentChildren!: number;

  @Column({
    type: "int",
    name: "single_family_household_lone_parent_non_dependent_children",
  })
  singleFamilyHouseholdLoneParentNonDependentChildren!: number;

  @Column({ type: "int", name: "single_family_household_other" })
  singleFamilyHouseholdOther!: number;

  @Column({
    type: "int",
    name: "single_family_household_other_family_composition",
  })
  singleFamilyHouseholdOtherFamilyComposition!: number;

  @Column({ type: "int", name: "other_household_types" })
  otherHouseholdTypes!: number;

  @Column({ type: "int", name: "other_household_types_dependent_children" })
  otherHouseholdTypesDependentChildren!: number;

  @Column({ type: "int", name: "other_household_types_other" })
  otherHouseholdTypesOther!: number;
}
