import type { CensusResponse } from './demographics';
import type { RadiusSelection } from './radius';

export const CHOROPLETH_COLORS = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'];
export const NO_DATA_COLOR = '#d1d5db';
export type CensusChoropleth = {
  selection: RadiusSelection; label: string; unit: string;
  values: Record<string, number | null>; colors: Record<string, string>;
  min: number | null; max: number | null; partial: string[];
};

export function createChoropleth(selection: RadiusSelection, response: CensusResponse, variable: string): CensusChoropleth | null {
  const metric = response.districts.flatMap((row) => row.metrics).find((item) => item.key === variable);
  if (!variable || !metric) return null;
  const rows = new Map(response.districts.map((row) => [row.district, row]));
  const values: Record<string, number | null> = {};
  const partial: string[] = [];
  for (const district of selection.districts) {
    const row = rows.get(district);
    const value = row?.metrics.find((item) => item.key === variable)?.value;
    values[district] = row && (row.status === 'complete' || row.status === 'partial') && typeof value === 'number' && Number.isFinite(value) ? value : null;
    if (row?.status === 'partial') partial.push(district);
  }
  const numbers = Object.values(values).filter((value): value is number => value !== null);
  const min = numbers.length ? Math.min(...numbers) : null;
  const max = numbers.length ? Math.max(...numbers) : null;
  const colors = Object.fromEntries(Object.entries(values).map(([district, value]) => {
    const bucket = value === null || min === null || max === null ? -1 : min === max ? 2
      : Math.min(4, Math.floor((value - min) / (max - min) * 5));
    return [district, bucket < 0 ? NO_DATA_COLOR : CHOROPLETH_COLORS[bucket]];
  }));
  return { selection, label: metric.label, unit: response.signal.unit, values, colors, min, max, partial };
}

export function formatChoroplethValue(value: number | null, unit: string): string {
  if (value === null) return 'No data';
  return value.toLocaleString('en-GB', unit === 'GBP/year'
    ? { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }
    : { maximumFractionDigits: 0 });
}
