// These expressions match the indexes in IndexDistrictLookup1785800000000.
// Keep normalisation identical for district selection and area denominators.
export function districtLinksSql(areaColumn: 'lsoa21cd' | 'msoa21cd', weighted = true) {
  const postcode = "regexp_replace(upper(pcd7), '[[:space:]]', '', 'g')";
  const district = `left(${postcode}, greatest(length(${postcode}) - 3, 0))`;
  const area = `NULLIF(trim(${areaColumn}), '')`;
  const valid = `${postcode} ~ '^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$|^GIR0AA$'`;
  return `district_postcodes AS (
    SELECT ${district} AS district, ${area} AS area,
      COUNT(DISTINCT ${postcode}) AS postcode_count
    FROM postcodelookup
    WHERE ${district} = ANY($1::text[]) AND ${area} IS NOT NULL AND ${valid}
    GROUP BY ${district}, ${area}
  ), ${weighted ? `selected_areas AS (
    SELECT DISTINCT area FROM district_postcodes
  ), area_totals AS (
    SELECT s.area, totals.postcode_count
    FROM selected_areas s CROSS JOIN LATERAL (
      SELECT COUNT(DISTINCT ${postcode}) AS postcode_count
      FROM postcodelookup
      WHERE ${area} = s.area AND ${valid}
    ) totals
  ), links AS (
    SELECT d.*, d.postcode_count::numeric / NULLIF(t.postcode_count, 0) AS weight
    FROM district_postcodes d JOIN area_totals t ON t.area = d.area
  )` : `links AS (
    SELECT * FROM district_postcodes
  )`}`;
}
