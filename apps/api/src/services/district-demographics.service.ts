import { AppDataSource } from '../database/data-source';

export class DistrictInputError extends Error {}
export function validateDistricts(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 300 || !value.every((district) => typeof district === 'string' && /^(?:[A-Z]{1,2}[0-9][0-9A-Z]?|GIR)$/i.test(district.trim()))) {
    throw new DistrictInputError('districts must be an array of up to 300 UK postcode districts, e.g. ["SW1A", "AB10"]');
  }
  return [...new Set(value.map((district: string) => district.trim().toUpperCase()))];
}

export const AGE_BANDS = [
  { key: 'under18', label: 'Under 18' },
  { key: 'age1824', label: '18–24' },
  { key: 'age2534', label: '25–34' },
  { key: 'age3544', label: '35–44' },
  { key: 'age4554', label: '45–54' },
  { key: 'age5564', label: '55–64' },
  { key: 'age6574', label: '65–74' },
  { key: 'age75Plus', label: '75+' },
] as const;

// Unique postcodes determine each district's share of an LSOA. Denominators
// include ALL districts, not just those requested, so estimates stay consistent.
// Strip the inward postcode (last three characters), rather than prefix matching:
// AB1 must not accidentally include AB10. Always use one common data vintage.
export const DISTRICT_AGE_SQL = `
WITH requested AS (
  SELECT district, ordinal FROM unnest($1::text[]) WITH ORDINALITY AS r(district, ordinal)
), latest AS (
  SELECT MAX(date) AS year FROM population_by_age_band
), normalized AS (
  SELECT regexp_replace(upper(pcd7), '[[:space:]]', '', 'g') AS postcode,
         NULLIF(trim(lsoa21cd), '') AS lsoa
  FROM postcodelookup
), unique_postcodes AS (
  SELECT DISTINCT n.postcode, n.lsoa, left(n.postcode, length(n.postcode) - 3) AS district
  FROM normalized n
  WHERE n.lsoa IS NOT NULL AND length(n.postcode) >= 5
    AND n.postcode ~ '^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$|^GIR0AA$'
), district_postcodes AS (
  SELECT district, lsoa, COUNT(*) AS postcode_count
  FROM unique_postcodes GROUP BY district, lsoa
), all_weights AS (
  SELECT district, lsoa,
    postcode_count::numeric / SUM(postcode_count) OVER (PARTITION BY lsoa) AS weight
  FROM district_postcodes
), links AS (
  SELECT w.* FROM all_weights w JOIN requested r ON r.district = w.district
), ages AS (
  SELECT DISTINCT ON (p.geography_code) p.*
  FROM population_by_age_band p
  WHERE p.date = (SELECT year FROM latest)
    AND p.geography_code IN (SELECT lsoa FROM links)
  ORDER BY p.geography_code, p.updated_at DESC, p.id DESC
)
SELECT r.district, (SELECT year FROM latest) AS year,
  COUNT(l.lsoa)::int AS "linkedLsoaCount", COUNT(a.geography_code)::int AS "matchedLsoaCount",
  SUM(a.total * l.weight) AS population,
  SUM(a.under_18 * l.weight) AS "under18", SUM(a.age_18_24 * l.weight) AS "age1824",
  SUM(a.age_25_34 * l.weight) AS "age2534", SUM(a.age_35_44 * l.weight) AS "age3544",
  SUM(a.age_45_54 * l.weight) AS "age4554", SUM(a.age_55_64 * l.weight) AS "age5564",
  SUM(a.age_65_74 * l.weight) AS "age6574", SUM(a.age_75_plus * l.weight) AS "age75Plus"
FROM requested r LEFT JOIN links l ON l.district = r.district
LEFT JOIN ages a ON a.geography_code = l.lsoa
GROUP BY r.district, r.ordinal ORDER BY r.ordinal`;

type RawRow = { district: string; year: number | null; linkedLsoaCount: number; matchedLsoaCount: number; population: string | null } & Record<typeof AGE_BANDS[number]['key'], string | null>;

export async function getDistrictAgePopulation(districts: string[]) {
  const records: RawRow[] = districts.length ? await AppDataSource.query(DISTRICT_AGE_SQL, [districts]) : [];
  return {
    methodology: 'postcode-weighted-estimates',
    note: 'LSOA populations are allocated by each district’s share of unique mapped postcodes across all districts. This assumes equal residents per postcode. Estimates cover whole districts, not just the radius. Counts retain fractional precision; round only for display.',
    districts: records.map((row) => {
      const population = row.population === null ? null : Number(row.population);
      return {
        district: row.district, year: row.year,
        linkedLsoaCount: row.linkedLsoaCount, matchedLsoaCount: row.matchedLsoaCount,
        missingLsoaCount: row.linkedLsoaCount - row.matchedLsoaCount,
        status: row.linkedLsoaCount === 0 ? 'no-mapping' : row.matchedLsoaCount === 0 ? 'no-data' : row.matchedLsoaCount < row.linkedLsoaCount ? 'partial' : 'complete',
        population,
        ageBands: AGE_BANDS.map(({ key, label }) => {
          const count = row[key] === null ? null : Number(row[key]);
          return { key, label, count, percentage: count !== null && population !== null && population > 0 ? Math.round(count / population * 1000) / 10 : null };
        }),
      };
    }),
  };
}
