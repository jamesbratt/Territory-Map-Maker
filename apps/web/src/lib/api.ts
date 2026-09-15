const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export type Lad = { code: string; name: string };

export async function getLads(q: string, signal?: AbortSignal): Promise<Lad[]> {
  const response = await fetch(`${API_URL}/lads?q=${encodeURIComponent(q)}`, { signal });
  if (!response.ok) throw new Error("Could not load districts. Please try again.");
  return response.json();
}

export async function rankLad(code: string, censusVariables: string[]): Promise<Record<string, unknown>[]> {
  const response = await fetch(`${API_URL}/lads/${encodeURIComponent(code)}/rank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ censusVariables }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as ApiError | null;
    throw new Error(error?.message ?? "Could not rank district postcodes.");
  }
  return response.json();
}

export type HealthStatus = {
  status: string;
};

type ApiError = {
  message?: string;
};

export async function getHealth(signal?: AbortSignal): Promise<HealthStatus> {
  const response = await fetch(`${API_URL}/health`, { signal });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  return response.json() as Promise<HealthStatus>;
}

export async function uploadCsv(
  file: File,
  postcodeColumn: string,
  censusVariables: string[],
): Promise<Record<string, unknown>[]> {
  const body = new FormData();
  body.append("file", file);
  body.append("postcode", postcodeColumn);
  censusVariables.forEach((variable) => body.append("censusVariables", variable));

  const response = await fetch(`${API_URL}/upload/bulk`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(error?.message ?? `Upload failed with status ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>[]>;
}
