import "reflect-metadata";
import { env } from "../config/env";
import { DataSource } from "typeorm";
import { PopulationByAgeBand } from "./entities/PopulationByAgeBand";
import { PostcodeLookup } from "./entities/Postcodelookup";
import { OccupationByCategory } from "./entities/OccupationByCategory";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.dbHost,
  port: env.dbPort,
  username: env.dbUsername,
  password: env.dbPassword,
  database: env.dbName,
  entities: [PopulationByAgeBand, PostcodeLookup, OccupationByCategory],
  synchronize: false,
  migrations: ["dist/database/migrations/*.js"],
  logging: false,
});
