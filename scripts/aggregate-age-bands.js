const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { createObjectCsvWriter } = require("csv-writer");

// Define age band mappings
const ageBands = {
  under_18: [
    "Age: Aged 4 years and under",
    "Age: Aged 5 to 9 years",
    "Age: Aged 10 to 14 years",
    "Age: Aged 15 to 19 years",
  ],
  age_18_24: ["Age: Aged 20 to 24 years"],
  age_25_34: ["Age: Aged 25 to 29 years", "Age: Aged 30 to 34 years"],
  age_35_44: ["Age: Aged 35 to 39 years", "Age: Aged 40 to 44 years"],
  age_45_54: ["Age: Aged 45 to 49 years", "Age: Aged 50 to 54 years"],
  age_55_64: ["Age: Aged 55 to 59 years", "Age: Aged 60 to 64 years"],
  age_65_74: ["Age: Aged 65 to 69 years", "Age: Aged 70 to 74 years"],
  age_75_plus: [
    "Age: Aged 75 to 79 years",
    "Age: Aged 80 to 84 years",
    "Age: Aged 85 years and over",
  ],
};

const inputFile = path.join(
  __dirname,
  "../census_data/census2021-ts007a-lsoa.csv",
);
const outputFile = path.join(
  __dirname,
  "../census_data/census2021-aggregated-age-bands.csv",
);

const aggregatedData = [];

// Read input CSV
fs.createReadStream(inputFile)
  .pipe(csv())
  .on("data", (row) => {
    const aggregatedRow = {
      date: row.date,
      geography: row.geography,
      geography_code: row["geography code"],
      total: parseInt(row["Age: Total"]) || 0,
    };

    // Aggregate each age band
    Object.entries(ageBands).forEach(([bandName, columns]) => {
      const total = columns.reduce((sum, colName) => {
        return sum + (parseInt(row[colName]) || 0);
      }, 0);
      aggregatedRow[bandName] = total;
    });

    aggregatedData.push(aggregatedRow);
  })
  .on("end", () => {
    // Write output CSV
    const csvWriter = createObjectCsvWriter({
      path: outputFile,
      header: [
        { id: "date", title: "date" },
        { id: "geography", title: "geography" },
        { id: "geography_code", title: "geography_code" },
        { id: "total", title: "total" },
        { id: "under_18", title: "under_18" },
        { id: "age_18_24", title: "age_18_24" },
        { id: "age_25_34", title: "age_25_34" },
        { id: "age_35_44", title: "age_35_44" },
        { id: "age_45_54", title: "age_45_54" },
        { id: "age_55_64", title: "age_55_64" },
        { id: "age_65_74", title: "age_65_74" },
        { id: "age_75_plus", title: "age_75_plus" },
      ],
    });

    csvWriter
      .writeRecords(aggregatedData)
      .then(() => {
        console.log(`✓ Aggregated CSV created successfully: ${outputFile}`);
        console.log(`✓ Total records processed: ${aggregatedData.length}`);
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
