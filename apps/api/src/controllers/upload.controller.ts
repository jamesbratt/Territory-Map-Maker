import { Request, Response } from "express";
import fs from "fs/promises";
import { rankPostcodes } from "../services/ranking.service";
import {
  VALID_CENSUS_VARIABLES,
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

      const enrichedRows = await rankPostcodes(rows, censusVariables);

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
