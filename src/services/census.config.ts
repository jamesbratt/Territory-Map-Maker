import { EntityTarget, Repository } from "typeorm";
import { PopulationByAgeBand } from "../database/entities/PopulationByAgeBand";
import { OccupationByCategory } from "../database/entities/OccupationByCategory";

// Define available census variables
export interface CensusVariableConfig {
  key: string;
  entity: EntityTarget<any>;
  columnProperty: keyof any;
  displayName: string;
}

export const CENSUS_VARIABLES: Record<string, CensusVariableConfig> = {
  // Population by age band
  under_18: {
    key: "under_18",
    entity: PopulationByAgeBand,
    columnProperty: "under18",
    displayName: "Under 18",
  },
  age_18_24: {
    key: "age_18_24",
    entity: PopulationByAgeBand,
    columnProperty: "age1824",
    displayName: "Age 18-24",
  },
  age_25_34: {
    key: "age_25_34",
    entity: PopulationByAgeBand,
    columnProperty: "age2534",
    displayName: "Age 25-34",
  },
  age_35_44: {
    key: "age_35_44",
    entity: PopulationByAgeBand,
    columnProperty: "age3544",
    displayName: "Age 35-44",
  },
  age_45_54: {
    key: "age_45_54",
    entity: PopulationByAgeBand,
    columnProperty: "age4554",
    displayName: "Age 45-54",
  },
  age_55_64: {
    key: "age_55_64",
    entity: PopulationByAgeBand,
    columnProperty: "age5564",
    displayName: "Age 55-64",
  },
  age_65_74: {
    key: "age_65_74",
    entity: PopulationByAgeBand,
    columnProperty: "age6574",
    displayName: "Age 65-74",
  },
  age_75_plus: {
    key: "age_75_plus",
    entity: PopulationByAgeBand,
    columnProperty: "age75Plus",
    displayName: "Age 75+",
  },
  // Occupation categories
  occ_1_managers: {
    key: "occ_1_managers",
    entity: OccupationByCategory,
    columnProperty: "occ1Managers",
    displayName: "Managers, Directors & Senior Officials",
  },
  occ_2_professional: {
    key: "occ_2_professional",
    entity: OccupationByCategory,
    columnProperty: "occ2Professional",
    displayName: "Professional Occupations",
  },
  occ_3_associate: {
    key: "occ_3_associate",
    entity: OccupationByCategory,
    columnProperty: "occ3Associate",
    displayName: "Associate Professional & Technical",
  },
  occ_4_administrative: {
    key: "occ_4_administrative",
    entity: OccupationByCategory,
    columnProperty: "occ4Administrative",
    displayName: "Administrative & Secretarial",
  },
  occ_5_skilled: {
    key: "occ_5_skilled",
    entity: OccupationByCategory,
    columnProperty: "occ5Skilled",
    displayName: "Skilled Trades",
  },
  occ_6_caring: {
    key: "occ_6_caring",
    entity: OccupationByCategory,
    columnProperty: "occ6Caring",
    displayName: "Caring, Leisure & Service",
  },
  occ_7_sales: {
    key: "occ_7_sales",
    entity: OccupationByCategory,
    columnProperty: "occ7Sales",
    displayName: "Sales & Customer Service",
  },
  occ_8_process: {
    key: "occ_8_process",
    entity: OccupationByCategory,
    columnProperty: "occ8Process",
    displayName: "Process, Plant & Machine Operatives",
  },
  occ_9_elementary: {
    key: "occ_9_elementary",
    entity: OccupationByCategory,
    columnProperty: "occ9Elementary",
    displayName: "Elementary Occupations",
  },
};

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
