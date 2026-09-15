import { In } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { LadNameLookup } from "../database/entities/LadNameLookup";
import { PostcodeLookup } from "../database/entities/Postcodelookup";
import { CENSUS_VARIABLES, calculatePercentile, getRankString } from "./census.config";
export type RankingRow = { postcode: string; data: Record<string, unknown> };
export type PostcodeData = { pcd7: string; lsoa21cd: string; msoa21cd: string | null; lat: string; long: string; lad25cd: string; lad25nm: string | null; };
export function postcodeQuery() {
 return AppDataSource.getRepository(PostcodeLookup).createQueryBuilder("postcode")
 .leftJoin(LadNameLookup, "ladName", '"ladName"."lad25cd" = "postcode"."lad25cd"')
 .select("postcode.pcd7", "pcd7").addSelect("postcode.lsoa21cd", "lsoa21cd")
 .addSelect("postcode.msoa21cd", "msoa21cd").addSelect("postcode.lat", "lat")
 .addSelect("postcode.long", "long").addSelect("postcode.lad25cd", "lad25cd")
 .addSelect("ladName.lad25nm", "lad25nm");
}
export async function rankPostcodes(rows: RankingRow[], censusVariables: string[], suppliedPostcodes?: PostcodeData[]) {
 const uniquePostcodes = [...new Set(rows.map(row => row.postcode.replace(/\s+/g, "")))];
 const postcodeData = suppliedPostcodes ?? (uniquePostcodes.length ? await postcodeQuery().where("postcode.pcd7 IN (:...uniquePostcodes)", { uniquePostcodes }).getRawMany<PostcodeData>() : []);
  // Normalize both sources so LAD rows and CSV rows use identical keys.
  for (const postcode of postcodeData) postcode.pcd7 = postcode.pcd7.replace(/\s+/g, "");

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
    { data: Map<string, number>; allValues: number[]; percentiles: Map<number, number | null> }
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
            where: { [config.areaCodeProperty]: In(areaCodes) },
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
      percentiles: new Map(),
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
      const { data, allValues, percentiles: cachedPercentiles } = censusDataByVariable[variableKey];
      const areaCode =
        config.geographyLevel === "msoa" ? msoaId : lsoaId;
      const value = areaCode ? (data.get(areaCode) ?? null) : null;
      // Many postcodes share census areas and values. Calculate each distinct
      // value only once per variable and request, without stale cross-request data.
      let rawPercentile: number | null = null;
      if (value !== null) {
        if (!cachedPercentiles.has(value)) {
          cachedPercentiles.set(value, calculatePercentile(value, allValues));
        }
        rawPercentile = cachedPercentiles.get(value)!;
      }
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


 return enrichedRows;
}
