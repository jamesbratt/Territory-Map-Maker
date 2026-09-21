import type { RadiusSelection } from './radius';

export type CensusSignal = { key: string; label: string; geography: 'LSOA' | 'MSOA'; unit: string; totalLabel: string; aggregation: 'sum' | 'mean' };
export type CensusDistrict = {
  district: string; year: number | null; total: number | null;
  linkedAreaCount: number; matchedAreaCount: number; missingAreaCount: number;
  status: 'complete' | 'partial' | 'no-mapping' | 'no-data';
  metrics: { key: string; label: string; value: number | null; percentage: number | null }[];
};
export type CensusResponse = { signal: CensusSignal; methodology: string; districts: CensusDistrict[] };
export const POPULATION_SIGNAL: CensusSignal = { key: 'population', label: 'Population', geography: 'LSOA', unit: 'people', totalLabel: 'Population', aggregation: 'sum' };
const censusApiUrl = () => import.meta.env.VITE_API_URL ?? '/api';

export async function getCensusSignals(signal: AbortSignal): Promise<CensusSignal[]> {
  const response = await fetch(`${censusApiUrl()}/demographics/signals`, { signal });
  if (!response.ok) throw new Error('Unable to load available census signals.');
  return response.json();
}

export async function getDistrictCensus(selection: RadiusSelection, censusSignal: CensusSignal, signal: AbortSignal): Promise<CensusResponse> {
  if (!selection.districts.length) return { signal: censusSignal, methodology: '', districts: [] };
  const response = await fetch(`${censusApiUrl()}/demographics/districts?signal=${encodeURIComponent(censusSignal.key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ districts: selection.districts }), signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? `Unable to load census data (${response.status}).`);
  }
  return response.json();
}

export type DistrictDemographics = {
  district: string; year: number | null; population: number | null;
  linkedLsoaCount: number; matchedLsoaCount: number; missingLsoaCount: number;
  status: 'complete' | 'partial' | 'no-mapping' | 'no-data';
  ageBands: { key: string; label: string; count: number | null; percentage: number | null }[];
};

export async function getRadiusDemographics(selection: RadiusSelection, signal: AbortSignal): Promise<DistrictDemographics[]> {
  if (!selection.districts.length) return [];
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? '/api'}/demographics/districts/age`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ districts: selection.districts }), signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? `Unable to load age population data (${response.status}).`);
  }
  const data = await response.json() as { districts: DistrictDemographics[] };
  return data.districts;
}
