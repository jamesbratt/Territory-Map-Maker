import "reflect-metadata";
import { env } from "../config/env";
import { DataSource } from "typeorm";
import { PopulationByAgeBand } from "./entities/PopulationByAgeBand";
import { PostcodeLookup } from "./entities/Postcodelookup";
import { OccupationByCategory } from "./entities/OccupationByCategory";
import { HouseholdComposition } from "./entities/HouseholdComposition";
import { CarVanAvailability } from "./entities/CarVanAvailability";
import { NsSecClassification } from "./entities/NsSecClassification";
import { HouseholdSize } from "./entities/HouseholdSize";
import { HouseholdTenure } from "./entities/HouseholdTenure";
import { EconomicActivity } from "./entities/EconomicActivity";
import { AccommodationType } from "./entities/AccommodationType";
import { QualificationLevel } from "./entities/QualificationLevel";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.dbHost,
  port: env.dbPort,
  username: env.dbUsername,
  password: env.dbPassword,
  database: env.dbName,
  entities: [
    PopulationByAgeBand,
    PostcodeLookup,
    OccupationByCategory,
    HouseholdComposition,
    CarVanAvailability,
    NsSecClassification,
    HouseholdSize,
    HouseholdTenure,
    EconomicActivity,
    AccommodationType,
    QualificationLevel,
  ],
  synchronize: false,
  migrations: ["dist/database/migrations/*.js"],
  logging: false,
});
