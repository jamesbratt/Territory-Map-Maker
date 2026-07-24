import { EntityTarget } from "typeorm";
import { PopulationByAgeBand } from "../database/entities/PopulationByAgeBand";
import { OccupationByCategory } from "../database/entities/OccupationByCategory";
import { HouseholdComposition } from "../database/entities/HouseholdComposition";
import { CarVanAvailability } from "../database/entities/CarVanAvailability";
import { NsSecClassification } from "../database/entities/NsSecClassification";
import { HouseholdSize } from "../database/entities/HouseholdSize";
import { HouseholdTenure } from "../database/entities/HouseholdTenure";
import { EconomicActivity } from "../database/entities/EconomicActivity";
import { AccommodationType } from "../database/entities/AccommodationType";
import { QualificationLevel } from "../database/entities/QualificationLevel";

// Define available census variables
export interface CensusVariableConfig {
  key: string;
  entity: EntityTarget<any>;
  columnProperty: keyof any;
  displayName: string;
  categoryName: string;
}

const censusCategoryNames = new Map<EntityTarget<any>, string>([
  [PopulationByAgeBand, "Age"],
  [OccupationByCategory, "Occupation"],
  [HouseholdComposition, "Household Composition"],
  [CarVanAvailability, "Car & Van Availability"],
  [NsSecClassification, "Socio-economic Classification"],
  [HouseholdSize, "Household Size"],
  [HouseholdTenure, "Household Tenure"],
  [EconomicActivity, "Economic Activity"],
  [AccommodationType, "Accommodation Type"],
  [QualificationLevel, "Qualifications"],
]);

const censusVariableDefinitions: Array<
  [string, EntityTarget<any>, string, string]
> = [
  ["under_18", PopulationByAgeBand, "under18", "Under 18"],
  ["age_18_24", PopulationByAgeBand, "age1824", "Age 18-24"],
  ["age_25_34", PopulationByAgeBand, "age2534", "Age 25-34"],
  ["age_35_44", PopulationByAgeBand, "age3544", "Age 35-44"],
  ["age_45_54", PopulationByAgeBand, "age4554", "Age 45-54"],
  ["age_55_64", PopulationByAgeBand, "age5564", "Age 55-64"],
  ["age_65_74", PopulationByAgeBand, "age6574", "Age 65-74"],
  ["age_75_plus", PopulationByAgeBand, "age75Plus", "Age 75+"],

  [
    "occ_1_managers",
    OccupationByCategory,
    "occ1Managers",
    "Managers, Directors & Senior Officials",
  ],
  [
    "occ_2_professional",
    OccupationByCategory,
    "occ2Professional",
    "Professional Occupations",
  ],
  [
    "occ_3_associate",
    OccupationByCategory,
    "occ3Associate",
    "Associate Professional & Technical",
  ],
  [
    "occ_4_administrative",
    OccupationByCategory,
    "occ4Administrative",
    "Administrative & Secretarial",
  ],
  ["occ_5_skilled", OccupationByCategory, "occ5Skilled", "Skilled Trades"],
  [
    "occ_6_caring",
    OccupationByCategory,
    "occ6Caring",
    "Caring, Leisure & Service",
  ],
  [
    "occ_7_sales",
    OccupationByCategory,
    "occ7Sales",
    "Sales & Customer Service",
  ],
  [
    "occ_8_process",
    OccupationByCategory,
    "occ8Process",
    "Process, Plant & Machine Operatives",
  ],
  [
    "occ_9_elementary",
    OccupationByCategory,
    "occ9Elementary",
    "Elementary Occupations",
  ],

  [
    "one_person_household",
    HouseholdComposition,
    "onePersonHousehold",
    "One Person Household",
  ],
  [
    "one_person_household_aged_66_plus",
    HouseholdComposition,
    "onePersonHouseholdAged66Plus",
    "One Person Household Aged 66+",
  ],
  [
    "one_person_household_other",
    HouseholdComposition,
    "onePersonHouseholdOther",
    "One Person Household Other",
  ],
  [
    "single_family_household",
    HouseholdComposition,
    "singleFamilyHousehold",
    "Single Family Household",
  ],
  [
    "single_family_household_all_aged_66_plus",
    HouseholdComposition,
    "singleFamilyHouseholdAllAged66Plus",
    "Single Family Household All Aged 66+",
  ],
  [
    "single_family_household_married_civil_partnership",
    HouseholdComposition,
    "singleFamilyHouseholdMarriedCivilPartnership",
    "Married/Civil Partnership Household",
  ],
  [
    "single_family_household_married_civil_partnership_no_children",
    HouseholdComposition,
    "singleFamilyHouseholdMarriedCivilPartnershipNoChildren",
    "Married/Civil Partnership No Children",
  ],
  [
    "single_family_household_married_civil_partnership_dependent_children",
    HouseholdComposition,
    "singleFamilyHouseholdMarriedCivilPartnershipDependentChildren",
    "Married/Civil Partnership Dependent Children",
  ],
  [
    "single_family_household_married_civil_partnership_non_dependent_children",
    HouseholdComposition,
    "singleFamilyHouseholdMarriedCivilPartnershipNonDependentChildren",
    "Married/Civil Partnership Non-Dependent Children",
  ],
  [
    "single_family_household_cohabiting_couple",
    HouseholdComposition,
    "singleFamilyHouseholdCohabitingCouple",
    "Cohabiting Couple Household",
  ],
  [
    "single_family_household_cohabiting_couple_no_children",
    HouseholdComposition,
    "singleFamilyHouseholdCohabitingCoupleNoChildren",
    "Cohabiting Couple No Children",
  ],
  [
    "single_family_household_cohabiting_couple_dependent_children",
    HouseholdComposition,
    "singleFamilyHouseholdCohabitingCoupleDependentChildren",
    "Cohabiting Couple Dependent Children",
  ],
  [
    "single_family_household_cohabiting_couple_non_dependent_children",
    HouseholdComposition,
    "singleFamilyHouseholdCohabitingCoupleNonDependentChildren",
    "Cohabiting Couple Non-Dependent Children",
  ],
  [
    "single_family_household_lone_parent",
    HouseholdComposition,
    "singleFamilyHouseholdLoneParent",
    "Lone Parent Household",
  ],
  [
    "single_family_household_lone_parent_dependent_children",
    HouseholdComposition,
    "singleFamilyHouseholdLoneParentDependentChildren",
    "Lone Parent Dependent Children",
  ],
  [
    "single_family_household_lone_parent_non_dependent_children",
    HouseholdComposition,
    "singleFamilyHouseholdLoneParentNonDependentChildren",
    "Lone Parent Non-Dependent Children",
  ],
  [
    "single_family_household_other",
    HouseholdComposition,
    "singleFamilyHouseholdOther",
    "Other Single Family Household",
  ],
  [
    "single_family_household_other_family_composition",
    HouseholdComposition,
    "singleFamilyHouseholdOtherFamilyComposition",
    "Other Family Composition",
  ],
  [
    "other_household_types",
    HouseholdComposition,
    "otherHouseholdTypes",
    "Other Household Types",
  ],
  [
    "other_household_types_dependent_children",
    HouseholdComposition,
    "otherHouseholdTypesDependentChildren",
    "Other Household Types Dependent Children",
  ],
  [
    "other_household_types_other",
    HouseholdComposition,
    "otherHouseholdTypesOther",
    "Other Household Types Other",
  ],

  ["no_cars_or_vans", CarVanAvailability, "noCarsOrVans", "No Cars Or Vans"],
  ["one_car_or_van", CarVanAvailability, "oneCarOrVan", "1 Car Or Van"],
  ["two_cars_or_vans", CarVanAvailability, "twoCarsOrVans", "2 Cars Or Vans"],
  [
    "three_plus_cars_or_vans",
    CarVanAvailability,
    "threePlusCarsOrVans",
    "3+ Cars Or Vans",
  ],

  [
    "higher_managerial_professional",
    NsSecClassification,
    "higherManagerialProfessional",
    "Higher Managerial & Professional",
  ],
  [
    "lower_managerial_professional",
    NsSecClassification,
    "lowerManagerialProfessional",
    "Lower Managerial & Professional",
  ],
  [
    "intermediate_occupations",
    NsSecClassification,
    "intermediateOccupations",
    "Intermediate Occupations",
  ],
  [
    "small_employers_own_account",
    NsSecClassification,
    "smallEmployersOwnAccount",
    "Small Employers & Own Account",
  ],
  [
    "lower_supervisory_technical",
    NsSecClassification,
    "lowerSupervisoryTechnical",
    "Lower Supervisory & Technical",
  ],
  [
    "semi_routine_occupations",
    NsSecClassification,
    "semiRoutineOccupations",
    "Semi-Routine Occupations",
  ],
  [
    "routine_occupations",
    NsSecClassification,
    "routineOccupations",
    "Routine Occupations",
  ],
  [
    "never_worked_long_term_unemployed",
    NsSecClassification,
    "neverWorkedLongTermUnemployed",
    "Never Worked & Long-Term Unemployed",
  ],
  [
    "full_time_students",
    NsSecClassification,
    "fullTimeStudents",
    "Full-Time Students",
  ],

  ["household_size_0", HouseholdSize, "householdSize0", "0 People Household"],
  ["household_size_1", HouseholdSize, "householdSize1", "1 Person Household"],
  ["household_size_2", HouseholdSize, "householdSize2", "2 People Household"],
  ["household_size_3", HouseholdSize, "householdSize3", "3 People Household"],
  ["household_size_4", HouseholdSize, "householdSize4", "4 People Household"],
  ["household_size_5", HouseholdSize, "householdSize5", "5 People Household"],
  ["household_size_6", HouseholdSize, "householdSize6", "6 People Household"],
  ["household_size_7", HouseholdSize, "householdSize7", "7 People Household"],
  [
    "household_size_8plus",
    HouseholdSize,
    "householdSize8Plus",
    "8+ People Household",
  ],

  ["owned_total", HouseholdTenure, "ownedTotal", "Owned"],
  ["owned_outright", HouseholdTenure, "ownedOutright", "Owned Outright"],
  [
    "owned_mortgage_or_loan",
    HouseholdTenure,
    "ownedMortgageOrLoan",
    "Owned With Mortgage Or Loan",
  ],
  [
    "shared_ownership_total",
    HouseholdTenure,
    "sharedOwnershipTotal",
    "Shared Ownership Total",
  ],
  [
    "shared_ownership",
    HouseholdTenure,
    "sharedOwnership",
    "Shared Ownership",
  ],
  ["social_rented_total", HouseholdTenure, "socialRentedTotal", "Social Rented"],
  [
    "social_rented_council_or_la",
    HouseholdTenure,
    "socialRentedCouncilOrLa",
    "Social Rented Council Or Local Authority",
  ],
  [
    "social_rented_other",
    HouseholdTenure,
    "socialRentedOther",
    "Other Social Rented",
  ],
  [
    "private_rented_total",
    HouseholdTenure,
    "privateRentedTotal",
    "Private Rented",
  ],
  [
    "private_rented_landlord_or_agency",
    HouseholdTenure,
    "privateRentedLandlordOrAgency",
    "Private Landlord Or Letting Agency",
  ],
  [
    "private_rented_other",
    HouseholdTenure,
    "privateRentedOther",
    "Other Private Rented",
  ],
  ["lives_rent_free", HouseholdTenure, "livesRentFree", "Lives Rent Free"],

  [
    "active_excl_students",
    EconomicActivity,
    "activeExclStudents",
    "Economically Active Excluding Students",
  ],
  [
    "active_excl_students_employed",
    EconomicActivity,
    "activeExclStudentsEmployed",
    "Employed Excluding Students",
  ],
  [
    "active_excl_students_employee",
    EconomicActivity,
    "activeExclStudentsEmployee",
    "Employee Excluding Students",
  ],
  [
    "active_excl_students_employee_part_time",
    EconomicActivity,
    "activeExclStudentsEmployeePartTime",
    "Part-Time Employee Excluding Students",
  ],
  [
    "active_excl_students_employee_full_time",
    EconomicActivity,
    "activeExclStudentsEmployeeFullTime",
    "Full-Time Employee Excluding Students",
  ],
  [
    "active_excl_students_self_emp_with_employees",
    EconomicActivity,
    "activeExclStudentsSelfEmpWithEmployees",
    "Self-Employed With Employees Excluding Students",
  ],
  [
    "active_excl_students_self_emp_with_employees_part_time",
    EconomicActivity,
    "activeExclStudentsSelfEmpWithEmployeesPartTime",
    "Part-Time Self-Employed With Employees Excluding Students",
  ],
  [
    "active_excl_students_self_emp_with_employees_full_time",
    EconomicActivity,
    "activeExclStudentsSelfEmpWithEmployeesFullTime",
    "Full-Time Self-Employed With Employees Excluding Students",
  ],
  [
    "active_excl_students_self_emp_no_employees",
    EconomicActivity,
    "activeExclStudentsSelfEmpNoEmployees",
    "Self-Employed Without Employees Excluding Students",
  ],
  [
    "active_excl_students_self_emp_no_employees_part_time",
    EconomicActivity,
    "activeExclStudentsSelfEmpNoEmployeesPartTime",
    "Part-Time Self-Employed Without Employees Excluding Students",
  ],
  [
    "active_excl_students_self_emp_no_employees_full_time",
    EconomicActivity,
    "activeExclStudentsSelfEmpNoEmployeesFullTime",
    "Full-Time Self-Employed Without Employees Excluding Students",
  ],
  [
    "active_excl_students_unemployed",
    EconomicActivity,
    "activeExclStudentsUnemployed",
    "Unemployed Excluding Students",
  ],
  [
    "active_full_time_student",
    EconomicActivity,
    "activeFullTimeStudent",
    "Economically Active Full-Time Student",
  ],
  [
    "active_full_time_student_employed",
    EconomicActivity,
    "activeFullTimeStudentEmployed",
    "Employed Full-Time Student",
  ],
  [
    "active_full_time_student_employee",
    EconomicActivity,
    "activeFullTimeStudentEmployee",
    "Employee Full-Time Student",
  ],
  [
    "active_full_time_student_employee_part_time",
    EconomicActivity,
    "activeFullTimeStudentEmployeePartTime",
    "Part-Time Employee Full-Time Student",
  ],
  [
    "active_full_time_student_employee_full_time",
    EconomicActivity,
    "activeFullTimeStudentEmployeeFullTime",
    "Full-Time Employee Full-Time Student",
  ],
  [
    "active_full_time_student_self_emp_with_employees",
    EconomicActivity,
    "activeFullTimeStudentSelfEmpWithEmployees",
    "Self-Employed With Employees Full-Time Student",
  ],
  [
    "active_full_time_student_self_emp_with_employees_part_time",
    EconomicActivity,
    "activeFullTimeStudentSelfEmpWithEmployeesPartTime",
    "Part-Time Self-Employed With Employees Full-Time Student",
  ],
  [
    "active_full_time_student_self_emp_with_employees_full_time",
    EconomicActivity,
    "activeFullTimeStudentSelfEmpWithEmployeesFullTime",
    "Full-Time Self-Employed With Employees Full-Time Student",
  ],
  [
    "active_full_time_student_self_emp_no_employees",
    EconomicActivity,
    "activeFullTimeStudentSelfEmpNoEmployees",
    "Self-Employed Without Employees Full-Time Student",
  ],
  [
    "active_full_time_student_self_emp_no_employees_part_time",
    EconomicActivity,
    "activeFullTimeStudentSelfEmpNoEmployeesPartTime",
    "Part-Time Self-Employed Without Employees Full-Time Student",
  ],
  [
    "active_full_time_student_self_emp_no_employees_full_time",
    EconomicActivity,
    "activeFullTimeStudentSelfEmpNoEmployeesFullTime",
    "Full-Time Self-Employed Without Employees Full-Time Student",
  ],
  [
    "active_full_time_student_unemployed",
    EconomicActivity,
    "activeFullTimeStudentUnemployed",
    "Unemployed Full-Time Student",
  ],
  ["inactive", EconomicActivity, "inactive", "Economically Inactive"],
  ["inactive_retired", EconomicActivity, "inactiveRetired", "Inactive Retired"],
  ["inactive_student", EconomicActivity, "inactiveStudent", "Inactive Student"],
  [
    "inactive_home_or_family",
    EconomicActivity,
    "inactiveHomeOrFamily",
    "Inactive Looking After Home Or Family",
  ],
  [
    "inactive_long_term_sick_or_disabled",
    EconomicActivity,
    "inactiveLongTermSickOrDisabled",
    "Inactive Long-Term Sick Or Disabled",
  ],
  ["inactive_other", EconomicActivity, "inactiveOther", "Inactive Other"],

  ["detached", AccommodationType, "detached", "Detached"],
  ["semi_detached", AccommodationType, "semiDetached", "Semi-Detached"],
  ["terraced", AccommodationType, "terraced", "Terraced"],
  [
    "purpose_built_flat",
    AccommodationType,
    "purposeBuiltFlat",
    "Purpose-Built Flat",
  ],
  [
    "converted_or_shared_house",
    AccommodationType,
    "convertedOrSharedHouse",
    "Converted Or Shared House",
  ],
  [
    "converted_building",
    AccommodationType,
    "convertedBuilding",
    "Converted Building",
  ],
  [
    "commercial_building",
    AccommodationType,
    "commercialBuilding",
    "Commercial Building",
  ],
  [
    "caravan_or_mobile_structure",
    AccommodationType,
    "caravanOrMobileStructure",
    "Caravan Or Mobile Structure",
  ],

  [
    "no_qualifications",
    QualificationLevel,
    "noQualifications",
    "No Qualifications",
  ],
  [
    "qualification_level_1",
    QualificationLevel,
    "qualificationLevel1",
    "Qualification Level 1",
  ],
  [
    "qualification_level_2",
    QualificationLevel,
    "qualificationLevel2",
    "Qualification Level 2",
  ],
  ["apprenticeship", QualificationLevel, "apprenticeship", "Apprenticeship"],
  [
    "qualification_level_3",
    QualificationLevel,
    "qualificationLevel3",
    "Qualification Level 3",
  ],
  [
    "qualification_level_4_plus",
    QualificationLevel,
    "qualificationLevel4Plus",
    "Qualification Level 4+",
  ],
  [
    "other_qualifications",
    QualificationLevel,
    "otherQualifications",
    "Other Qualifications",
  ],
];

export const CENSUS_VARIABLES =
  censusVariableDefinitions.reduce<Record<string, CensusVariableConfig>>(
    (variables, [key, entity, columnProperty, displayName]) => {
      variables[key] = {
        key,
        entity,
        columnProperty,
        displayName,
        categoryName: censusCategoryNames.get(entity) ?? "Other",
      };
      return variables;
    },
    {},
  );

export const VALID_CENSUS_VARIABLES = Object.keys(CENSUS_VARIABLES);

// Function to calculate percentile
export const calculatePercentile = (
  value: number | null,
  allValues: number[],
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const countBelow = allValues.filter((v) => v < value).length;
  return Math.round((countBelow / allValues.length) * 100);
};

// Function to get rank string
export const getRankString = (percentile: number | null): string | null => {
  if (percentile === null) {
    return null;
  }
  if (percentile >= 90) return "top 10%";
  if (percentile >= 80) return "top 20%";
  if (percentile >= 70) return "top 30%";
  if (percentile >= 60) return "top 40%";
  if (percentile >= 50) return "top 50%";
  if (percentile >= 40) return "40-50%";
  if (percentile >= 30) return "30-40%";
  if (percentile >= 20) return "20-30%";
  if (percentile >= 10) return "10-20%";
  return "bottom 10%";
};
