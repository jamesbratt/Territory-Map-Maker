import { Request, Response } from "express";
import fs from "fs/promises";
import { AppDataSource } from "../database/data-source";
import { LadNameLookup } from "../database/entities/LadNameLookup";
import { PostcodeLookup } from "../database/entities/Postcodelookup";
import {
  CENSUS_VARIABLES,
  VALID_CENSUS_VARIABLES,
  calculatePercentile,
  getRankString,
} from "../services/census.config";

const MAX_BULK_UPLOAD_ROWS = 1_000;

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

    const { postcode: postcodeColumn } = req.body;
    const censusVariables =
      typeof req.body.censusVariables === "string"
        ? [req.body.censusVariables]
        : req.body.censusVariables;
    if (typeof postcodeColumn !== "string" || postcodeColumn.trim() === "") {
      res.status(400).json({
        message: "Request body must include postcode column header mapping",
      });
      await fs.rm(file.path, { force: true });
      return;
    }

    if (
      !censusVariables ||
      !Array.isArray(censusVariables) ||
      censusVariables.length === 0
    ) {
      res.status(400).json({
        message: "censusVariables must be a non-empty array",
      });
      await fs.rm(file.path, { force: true });
      return;
    }

    // Validate all requested census variables
    const invalidVariables = censusVariables.filter(
      (v: unknown) =>
        typeof v !== "string" || !VALID_CENSUS_VARIABLES.includes(v),
    );
    if (invalidVariables.length > 0) {
      res.status(400).json({
        message: `Invalid census variables: ${invalidVariables.join(", ")}. Valid options: ${VALID_CENSUS_VARIABLES.join(", ")}`,
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

      // Process only the first 1,000 data rows from larger CSV files.
      const rows = lines
        .slice(0, MAX_BULK_UPLOAD_ROWS)
        .map((line, rowIndex) => {
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

      const postcodeData =
        uniquePostcodes.length > 0
          ? await postcodeRepository
              .createQueryBuilder("postcode")
              .leftJoin(
                LadNameLookup,
                "ladName",
                '"ladName"."lad25cd" = "postcode"."lad25cd"',
              )
              .select("postcode.pcd7", "pcd7")
              .addSelect("postcode.lsoa21cd", "lsoa21cd")
              .addSelect("postcode.msoa21cd", "msoa21cd")
              .addSelect("postcode.lat", "lat")
              .addSelect("postcode.long", "long")
              .addSelect("postcode.lad25cd", "lad25cd")
              .addSelect("ladName.lad25nm", "lad25nm")
              .where("postcode.pcd7 IN (:...uniquePostcodes)", {
                uniquePostcodes,
              })
              .getRawMany<{
                pcd7: string;
                lsoa21cd: string;
                msoa21cd: string | null;
                lat: string;
                long: string;
                lad25cd: string;
                lad25nm: string | null;
              }>()
          : [];

      // Create postcode lookup maps
      const lsoaMap = new Map(postcodeData.map((p) => [p.pcd7, p.lsoa21cd]));
      const msoaMap = new Map(postcodeData.map((p) => [p.pcd7, p.msoa21cd]));
      const coordinateMap = new Map(
        postcodeData.map((p) => [
          p.pcd7,
          {
            lat: p.lat,
            long: p.long,
          },
        ]),
      );
      const ladMap = new Map(
        postcodeData.map((p) => [
          p.pcd7,
          {
            lad25cd: p.lad25cd,
            lad25nm: p.lad25nm,
          },
        ]),
      );

      // Extract unique LSOA IDs
      const uniqueLSOAs = [
        ...new Set(
          Array.from(lsoaMap.values()).filter((lsoa) => lsoa !== null),
        ),
      ] as string[];
      const uniqueMSOAs = [
        ...new Set(
          Array.from(msoaMap.values()).filter(
            (msoa): msoa is string => msoa !== null,
          ),
        ),
      ];

      // Fetch data for all requested census variables
      const censusDataByVariable: Record<
        string,
        { data: Map<string, number>; allValues: number[] }
      > = {};
      const geographyByCode = new Map<string, string>();

      for (const variableKey of censusVariables) {
        const config = CENSUS_VARIABLES[variableKey];
        const repository = AppDataSource.getRepository(config.entity);
        const areaCodes =
          config.geographyLevel === "msoa" ? uniqueMSOAs : uniqueLSOAs;
        const selectedProperties = [
          config.areaCodeProperty,
          config.columnProperty,
          ...(config.geographyProperty ? [config.geographyProperty] : []),
        ];

        const variableData =
          areaCodes.length > 0
            ? await repository.find({
                where: areaCodes.map((areaCode) => ({
                  [config.areaCodeProperty]: areaCode,
                })),
                select: selectedProperties,
              })
            : [];

        for (const censusRow of variableData as Record<string, any>[]) {
          if (
            config.geographyProperty &&
            typeof censusRow[config.areaCodeProperty] === "string" &&
            typeof censusRow[config.geographyProperty] === "string"
          ) {
            geographyByCode.set(
              censusRow[config.areaCodeProperty],
              censusRow[config.geographyProperty],
            );
          }
        }

        // Fetch ALL population data for this variable to calculate percentiles
        const allVariableData = await repository.find({
          select: [config.columnProperty],
        });

        // Extract all values and sort them
        const allValues = allVariableData
          .map((p) => p[config.columnProperty] as number)
          .filter((v) => v !== null && v !== undefined)
          .sort((a, b) => a - b);

        // Store for later use
        censusDataByVariable[variableKey] = {
          data: new Map(
            variableData.map((p) => [
              p[config.areaCodeProperty],
              p[config.columnProperty] as number,
            ]),
          ),
          allValues,
        };
      }

      // Enrich rows with LSOA ID and all census variables
      const enrichedRows = rows.map((row) => {
        const cleanPostcode = row.postcode.replace(/\s+/g, "");
        const lsoaId = lsoaMap.get(cleanPostcode);
        const msoaId = msoaMap.get(cleanPostcode);
        const coordinates = coordinateMap.get(cleanPostcode);
        const lad = ladMap.get(cleanPostcode);

        const enrichedRow: Record<string, any> = {
          ...row.data,
          postcode: row.postcode,
          lat: coordinates?.lat ?? null,
          long: coordinates?.long ?? null,
          lad25cd: lad?.lad25cd ?? null,
          lad25nm: lad?.lad25nm ?? null,
          lsoa_id: lsoaId || null,
          geography: lsoaId ? (geographyByCode.get(lsoaId) ?? null) : null,
          geography_code: lsoaId || null,
        };

        const percentiles: number[] = [];
        const censusValues: Record<string, number | string | null>[] = [];

        for (const variableKey of censusVariables) {
          const config = CENSUS_VARIABLES[variableKey];
          const { data, allValues } = censusDataByVariable[variableKey];
          const areaCode =
            config.geographyLevel === "msoa" ? msoaId : lsoaId;
          const value = areaCode ? (data.get(areaCode) ?? null) : null;
          const rawPercentile = calculatePercentile(
            value as number | null,
            allValues,
          );
          const affinity =
            rawPercentile === null
              ? null
              : config.direction === "lower"
                ? 100 - rawPercentile
                : rawPercentile;
          const rank = getRankString(affinity);

          censusValues.push({
            [variableKey]: value,
            [`${variableKey}_affinity`]: affinity,
            [`${variableKey}_rank`]: rank,
            [`${variableKey}_friendly_label`]: config.displayName,
            [`${variableKey}_category_name`]: config.categoryName,
          });

          if (affinity !== null) {
            percentiles.push(affinity);
          }
        }

        const segmentAffinityScore =
          percentiles.length > 0
            ? Math.round(
                percentiles.reduce((sum, percentile) => sum + percentile, 0) /
                  percentiles.length,
              )
            : null;

        enrichedRow.censusValues = censusValues;
        enrichedRow.segment_affinity_score = segmentAffinityScore;
        enrichedRow.segment_affinity_rank = getRankString(segmentAffinityScore);

        return enrichedRow;
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
