const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { createObjectCsvWriter } = require("csv-writer");

// Function to normalize column names to database-friendly format
const normalizeColumnName = (name) => {
  // Keep standard columns as-is
  if (["date", "geography", "geography code"].includes(name.toLowerCase())) {
    return name.toLowerCase().replace(" ", "_");
  }

  // Handle occupation columns
  if (name.toLowerCase().includes("occupation")) {
    // Check if it's a total column
    if (name.includes("Total:")) {
      return "occ_total";
    }

    // Extract occupation number and title
    const match = name.match(/(\d+)\.\s*([^,]+)/);
    if (match) {
      const num = match[1];
      const title = match[2]
        .toLowerCase()
        .split(/\s+/)[0] // Take first word
        .replace(/[^a-z0-9]/g, ""); // Remove special chars
      return `occ_${num}_${title}`;
    }
  }

  // Fallback: generic normalization
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, "") // Remove special characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/_+/g, "_") // Replace multiple underscores
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
};

const inputFile = path.join(
  __dirname,
  "../census_data/census2021-ts063-lsoa.csv",
);
const outputFile = path.join(
  __dirname,
  "../census_data/census2021-ts063-lsoa-normalized.csv",
);

let headers = [];
const normalizedData = [];

// Read input CSV
fs.createReadStream(inputFile)
  .pipe(csv())
  .on("data", (row) => {
    // Capture headers from first row
    if (headers.length === 0) {
      headers = Object.keys(row).map((h) => normalizeColumnName(h));
    }

    // Transform row with normalized keys
    const normalizedRow = {};
    Object.entries(row).forEach(([originalKey, value], index) => {
      normalizedRow[headers[index]] = value;
    });

    normalizedData.push(normalizedRow);
  })
  .on("end", () => {
    // Write output CSV
    const csvWriter = createObjectCsvWriter({
      path: outputFile,
      header: headers.map((name) => ({ id: name, title: name })),
    });

    csvWriter
      .writeRecords(normalizedData)
      .then(() => {
        console.log(`✓ Normalized CSV created successfully: ${outputFile}`);
        console.log(`✓ Total records processed: ${normalizedData.length}`);
        console.log("\nNormalized column names:");
        headers.forEach((header) => console.log(`  - ${header}`));
      })
      .catch((err) => {
        console.error("Error writing CSV:", err);
        process.exit(1);
      });
  })
  .on("error", (err) => {
    console.error("Error reading CSV:", err);
    process.exit(1);
  });
