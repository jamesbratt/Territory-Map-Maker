import { Request, Response } from "express";
import fs from "fs/promises";
import { AppDataSource } from "../database/data-source";
import { PostcodeLookup } from "../database/entities/Postcodelookup";
import { PopulationByAgeBand } from "../database/entities/PopulationByAgeBand";

const VALID_AGE_RANGES = [
  "under_18",
  "age_18_24",
  "age_25_34",
  "age_35_44",
  "age_45_54",
  "age_55_64",
  "age_65_74",
  "age_75_plus",
] as const;

type AgeRange = (typeof VALID_AGE_RANGES)[number];

// Map from CSV/request column names to TypeScript property names
const AGE_RANGE_PROPERTY_MAP: Record<AgeRange, keyof PopulationByAgeBand> = {
  under_18: "under18",
  age_18_24: "age1824",
  age_25_34: "age2534",
  age_35_44: "age3544",
  age_45_54: "age4554",
  age_55_64: "age5564",
  age_65_74: "age6574",
  age_75_plus: "age75Plus",
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
};

export class UploadController {
  static async bulkCreate(req: Request, res: Response): Promise<void> {
    const file = (req as unknown as { file?: { path: string } }).file;
    if (!file) {
      res.status(400).json({ message: "CSV file is required" });
      return;
    }

    const { postcode: postcodeColumn, ageRange } = req.body;
    if (typeof postcodeColumn !== "string" || postcodeColumn.trim() === "") {
      res.status(400).json({
        message: "Request body must include postcode column header mapping",
      });
      await fs.rm(file.path, { force: true });
      return;
    }

    if (
      !ageRange ||
      typeof ageRange !== "string" ||
      !VALID_AGE_RANGES.includes(ageRange as AgeRange)
    ) {
      res.status(400).json({
        message: `ageRange must be one of: ${VALID_AGE_RANGES.join(", ")}`,
      });
      await fs.rm(file.path, { force: true });
      return;
    }

    try {
      const contents = await fs.readFile(file.path, "utf8");
      const normalized = contents.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const lines = normalized
        .split("\n")
        .filter((line) => line.trim().length > 0);

      if (lines.length === 0) {
        res.status(400).json({ message: "CSV file is empty" });
        return;
      }

      const headerLine = lines.shift()!;
      const headers = parseCsvLine(headerLine).map((header) =>
        header.replace(/^\uFEFF/, "").trim(),
      );

      const postcodeColumnIndex = headers.indexOf(postcodeColumn.trim());
      if (postcodeColumnIndex < 0) {
        res.status(400).json({
          message: `Postcode column "${postcodeColumn}" not found in CSV headers`,
        });
        return;
      }

      // Parse all rows
      const rows = lines.map((line, rowIndex) => {
        const values = parseCsvLine(line);
        return {
          rowIndex: rowIndex + 2,
          data: Object.fromEntries(
            headers.map((header, index) => [
              header,
              values[index]?.trim() ?? "",
            ]),
          ),
          postcode: values[postcodeColumnIndex]?.trim() ?? "",
        };
      });

      // Validate all rows have postcode
      const invalidRow = rows.find((row) => !row.postcode);
      if (invalidRow) {
        res.status(400).json({
          message: `Row ${invalidRow.rowIndex} is missing postcode value`,
        });
        return;
      }

      // Extract unique postcodes and fetch LSOA mappings
      const uniquePostcodes = [
        ...new Set(rows.map((r) => r.postcode.replace(/\s+/g, ""))),
      ];
      const postcodeRepository = AppDataSource.getRepository(PostcodeLookup);

      const postcodeData = await postcodeRepository.find({
        where: uniquePostcodes.map((pcd) => ({ pcd7: pcd })),
        select: ["pcd7", "lsoa21cd"],
      });

      // Create postcode to LSOA lookup map
      const lsoaMap = new Map(postcodeData.map((p) => [p.pcd7, p.lsoa21cd]));

      // Extract unique LSOA IDs
      const uniqueLSOAs = [
        ...new Set(
          Array.from(lsoaMap.values()).filter((lsoa) => lsoa !== null),
        ),
      ] as string[];

      // Fetch population data for age range
      const populationRepository =
        AppDataSource.getRepository(PopulationByAgeBand);
      const ageRangeProperty = AGE_RANGE_PROPERTY_MAP[ageRange as AgeRange];

      const populationData = await populationRepository.find({
        where: uniqueLSOAs.map((lsoa) => ({ geographyCode: lsoa })),
        select: ["geographyCode", ageRangeProperty],
      });

      // Fetch ALL population data for the age range to calculate percentiles
      const allPopulationData = await populationRepository.find({
        select: [ageRangeProperty],
      });

      // Extract all age values and sort them
      const allAgeValues = allPopulationData
        .map((p) => p[ageRangeProperty] as number)
        .filter((v) => v !== null && v !== undefined)
        .sort((a, b) => a - b);

      // Function to calculate percentile
      const calculatePercentile = (value: number | null): number | null => {
        if (value === null || value === undefined) {
          return null;
        }
        const countBelow = allAgeValues.filter((v) => v < value).length;
        return Math.round((countBelow / allAgeValues.length) * 100);
      };

      // Function to get rank string
      const getRankString = (percentile: number | null): string | null => {
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

      // Create LSOA to population data lookup map
      const populationMap = new Map(
        populationData.map((p) => [p.geographyCode, p[ageRangeProperty]]),
      );

      // Enrich rows with LSOA ID, age data, percentile, and rank
      const enrichedRows = rows.map((row) => {
        const cleanPostcode = row.postcode.replace(/\s+/g, "");
        const lsoaId = lsoaMap.get(cleanPostcode);
        const ageValue = lsoaId ? populationMap.get(lsoaId) || null : null;
        const percentile = calculatePercentile(ageValue as number | null);
        const rank = getRankString(percentile);

        return {
          ...row.data,
          postcode: row.postcode,
          lsoa_id: lsoaId || null,
          [ageRange]: ageValue,
          [`${ageRange}_percentile`]: percentile,
          [`${ageRange}_rank`]: rank,
        };
      });

      res.status(200).json(enrichedRows);
    } catch (error) {
      res.status(500).json({
        message: "Failed to process CSV upload",
        error: error instanceof Error ? error.message : undefined,
      });
    } finally {
      await fs.rm(file.path, { force: true });
    }
  }
}
