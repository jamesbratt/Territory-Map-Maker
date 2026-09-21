import { AppDataSource } from '../database/data-source';
import { CENSUS_VARIABLES } from './census.config';
import { DistrictInputError, getDistrictAgePopulation } from './district-demographics.service';

const definitions = [
  ['population', 'Population', 'Age', 'total', 'people', 'Population'],
  ['occupation', 'Occupation', 'Occupation', 'occTotal', 'people', 'People in employment'],
  ['household-composition', 'Household composition', 'Household Composition', 'totalHouseholds', 'households', 'Households'],
  ['car-van-availability', 'Car & van availability', 'Car & Van Availability', 'householdsTotal', 'households', 'Households'],
  ['socio-economic', 'Socio-economic classification', 'Socio-economic Classification', 'totalResidents', 'people', 'Residents'],
  ['household-size', 'Household size', 'Household Size', 'householdSpacesTotal', 'household spaces', 'Household spaces'],
  ['household-tenure', 'Household tenure', 'Household Tenure', 'householdsTotal', 'households', 'Households'],
  ['economic-activity', 'Economic activity', 'Economic Activity', 'residents16plusTotal', 'people', 'Residents aged 16+'],
  ['accommodation', 'Accommodation type', 'Accommodation Type', 'householdsTotal', 'households', 'Households'],
  ['qualifications', 'Qualifications', 'Qualifications', 'residents16plusTotal', 'people', 'Residents aged 16+'],
  ['household-income', 'Household income', 'Household Income', '', 'GBP/year', 'Annual household income'],
] as const;

export const CENSUS_SIGNALS = definitions.map(([key, label, category, totalProperty, unit, totalLabel]) => ({
  key, label, category, totalProperty, unit, totalLabel,
  geography: key === 'household-income' ? 'MSOA' : 'LSOA',
  aggregation: key === 'household-income' ? 'mean' : 'sum',
}));

export function getSignal(value: unknown = 'population') {
  const signal = CENSUS_SIGNALS.find((item) => item.key === value);
  if (!signal) throw new DistrictInputError('Unknown census signal. Use GET /api/demographics/signals for available signals.');
  return signal;
}

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

export async function getDistrictSignal(districts: string[], requestedSignal: unknown = 'population') {
  const config = getSignal(requestedSignal);
  const signal = { key: config.key, label: config.label, geography: config.geography, unit: config.unit, totalLabel: config.totalLabel, aggregation: config.aggregation };
  if (config.key === 'population') {
    const response = await getDistrictAgePopulation(districts);
    return { signal, methodology: response.methodology, districts: response.districts.map((row) => ({
      district: row.district, year: row.year, total: row.population, status: row.status,
      linkedAreaCount: row.linkedLsoaCount, matchedAreaCount: row.matchedLsoaCount, missingAreaCount: row.missingLsoaCount,
      metrics: row.ageBands.map(({ key, label, count, percentage }) => ({ key, label, value: count, percentage })),
    })) };
  }
  const income = config.aggregation === 'mean';
  // Only trusted registry entries and entity metadata supply SQL identifiers.
  // Higher/lower income signals share columns; expose each measure once.
  const variables = Object.values(CENSUS_VARIABLES).filter((item) => item.categoryName === config.category);
  const columns = [...new Map(variables.map((item) => [item.columnProperty, item])).values()];
  const metadata = AppDataSource.getMetadata(columns[0].entity);
  const column = (property: string) => {
    const field = metadata.findColumnWithPropertyName(property);
    if (!field) throw new Error(`Missing census column: ${property}`);
    return quote(field.databaseName);
  };
  const measures = columns.map((item, index) => ({
    key: String(item.columnProperty),
    label: income ? (item.columnProperty === 'annualIncomeBeforeCosts' ? 'Before housing costs' : 'After housing costs') : item.displayName,
    field: column(String(item.columnProperty)), alias: `metric${index}`,
  }));
  const table = quote(metadata.tableName);
  const areaColumn = income ? 'msoa21cd' : 'lsoa21cd';
  const geographyColumn = column(income ? 'msoa21cd' : 'geographyCode');
  const metricSelect = measures.map(({ field, alias }) => income
    // The income source stores annual values in GBP thousands; API values are GBP.
    ? `1000.0 * SUM(a.${field} * l.postcode_count) / NULLIF(SUM(l.postcode_count) FILTER (WHERE a.${field} IS NOT NULL), 0) AS "${alias}"`
    : `SUM(a.${field} * l.weight) AS "${alias}"`).join(',\n');
  const sql = `WITH requested AS (
    SELECT district, ordinal FROM unnest($1::text[]) WITH ORDINALITY AS r(district, ordinal)
  ), latest AS (
    SELECT ${income ? 'NULL::int' : 'MAX(date)'} AS year ${income ? '' : `FROM ${table}`}
  ), normalized AS (
    SELECT regexp_replace(upper(pcd7), '[[:space:]]', '', 'g') AS postcode,
      NULLIF(trim(${areaColumn}), '') AS area FROM postcodelookup
  ), unique_postcodes AS (
    SELECT DISTINCT postcode, area, left(postcode, length(postcode) - 3) AS district
    FROM normalized WHERE area IS NOT NULL AND length(postcode) >= 5
      AND postcode ~ '^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$|^GIR0AA$'
  ), district_postcodes AS (
    SELECT district, area, COUNT(*) AS postcode_count FROM unique_postcodes GROUP BY district, area
  ), all_weights AS (
    SELECT *, postcode_count::numeric / SUM(postcode_count) OVER (PARTITION BY area) AS weight FROM district_postcodes
  ), links AS (
    SELECT w.* FROM all_weights w JOIN requested r ON r.district = w.district
  ), observations AS (
    SELECT DISTINCT ON (p.${geographyColumn}) p.* FROM ${table} p
    WHERE p.${geographyColumn} IN (SELECT area FROM links)
      ${income ? '' : 'AND p.date = (SELECT year FROM latest)'}
    ORDER BY p.${geographyColumn}, p.updated_at DESC, p.id DESC
  ) SELECT r.district, (SELECT year FROM latest) AS year,
    COUNT(l.area)::int AS "linkedAreaCount", COUNT(a.${geographyColumn})::int AS "matchedAreaCount",
    ${income ? 'NULL::numeric' : `SUM(a.${column(config.totalProperty)} * l.weight)`} AS total,
    ${metricSelect}
  FROM requested r LEFT JOIN links l ON l.district = r.district
  LEFT JOIN observations a ON a.${geographyColumn} = l.area
  GROUP BY r.district, r.ordinal ORDER BY r.ordinal`;
  type Raw = { district: string; year: number | null; linkedAreaCount: number; matchedAreaCount: number; total: string | null } & Record<string, unknown>;
  const rows: Raw[] = districts.length ? await AppDataSource.query(sql, [districts]) : [];
  return { signal, methodology: income ? 'postcode-weighted-mean' : 'postcode-weighted-estimates', districts: rows.map((row) => {
    const total = row.total === null ? null : Number(row.total);
    return {
      district: row.district, year: row.year, total,
      linkedAreaCount: row.linkedAreaCount, matchedAreaCount: row.matchedAreaCount,
      missingAreaCount: row.linkedAreaCount - row.matchedAreaCount,
      status: !row.linkedAreaCount ? 'no-mapping' : !row.matchedAreaCount ? 'no-data' : row.matchedAreaCount < row.linkedAreaCount ? 'partial' : 'complete',
      metrics: measures.map(({ key, label, alias }) => {
        const value = row[alias] === null ? null : Number(row[alias]);
        return { key, label, value, percentage: !income && value !== null && total !== null && total > 0 ? Math.round(value / total * 1000) / 10 : null };
      }),
    };
  }) };
}
