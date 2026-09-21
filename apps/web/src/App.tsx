import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import { getBoundaries } from "./lib/api";
import {
  parseTerritories,
  STORAGE_KEY,
  toggleDistrict,
  type Territory,
} from "./lib/territories";
import { TerritoryMap } from "./components/TerritoryMap";
import { TerritorySidebar } from "./components/TerritorySidebar";
import { LocationLayerPanel } from "./components/LocationLayerPanel";
import type { LocationLayer } from "./lib/locations";
import {
  countTerritoryMarkers,
  indexDistrictPolygons,
  locateMarkers,
} from "./lib/territory-counts";
import { districtsInRadius, type RadiusSelection } from "./lib/radius";
import { RadiusResults } from "./components/RadiusResults";
import type { CensusChoropleth } from "./lib/choropleth";

export default function App() {
  const [drawingRadius, setDrawingRadius] = useState(false);
  const [radius, setRadius] = useState<RadiusSelection | null>(null);
  const [choropleth, setChoropleth] = useState<CensusChoropleth | null>(null);
  function startRadius() {
    setActiveId(null);
    setDrawingRadius(true);
  }
  const [locations, setLocations] = useState<LocationLayer | null>(null);
  const [locationZoom, setLocationZoom] = useState(0);
  const [initial] = useState(() => {
    try {
      return {
        territories: parseTerritories(localStorage.getItem(STORAGE_KEY)),
        error: "",
      };
    } catch {
      return {
        territories: [],
        error:
          "Saved territories could not be loaded. Changes may not persist in this browser.",
      };
    }
  });
  const [territories, setTerritories] = useState<Territory[]>(
    initial.territories,
  );
  const [storageError, setStorageError] = useState(initial.error);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [boundaries, setBoundaries] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const districtIndex = useMemo(
    () => indexDistrictPolygons(boundaries),
    [boundaries],
  );
  const markerDistricts = useMemo(
    () => locateMarkers(districtIndex, locations?.rows ?? []),
    [districtIndex, locations?.rows],
  );
  const markerCounts = useMemo(
    () => countTerritoryMarkers(territories, markerDistricts),
    [territories, markerDistricts],
  );
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    getBoundaries(controller.signal)
      .then(setBoundaries)
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [attempt]);
  function update(next: Territory[]) {
    setTerritories(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "Your changes cannot be saved in this browser. Keep this tab open to retain your work.",
      );
    }
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveId(null);
        setDrawingRadius(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const assigned = new Set(territories.flatMap((t) => t.districts)).size;
  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Territory maker home">
          <span className="brand-icon">▦</span>territory
          <span className="brand-light">maker</span>
        </a>
        <span className="market-badge">UNITED KINGDOM</span>
        <div className="header-stats">
          <strong>{assigned.toLocaleString("en-GB")}</strong> districts assigned
          <span className="divider" />
          {territories.length} territories
        </div>
      </header>
      {storageError && (
        <div className="storage-error" role="alert">
          {storageError}
        </div>
      )}
      <main className="workspace">
        {boundaries ? (
          <TerritoryMap
            choropleth={choropleth?.selection === radius ? choropleth : null}
            radius={radius}
            drawingRadius={drawingRadius}
            onStartRadius={startRadius}
            onCancelRadius={() => setDrawingRadius(false)}
            onRadiusCenter={(center) => {
              setRadius({
                center,
                districts: districtsInRadius(districtIndex, center),
              });
              setDrawingRadius(false);
            }}
            locations={locations}
            locationZoom={locationZoom}
            boundaries={boundaries}
            territories={territories}
            activeId={activeId}
            onToggle={(district) => {
              if (activeId)
                update(toggleDistrict(territories, activeId, district));
            }}
          />
        ) : (
          <section className="boundary-status" aria-live="polite">
            {error ? (
              <>
                <h2>Unable to load boundaries</h2>
                <p>{error}</p>
                <button
                  className="primary"
                  onClick={() => setAttempt(attempt + 1)}
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <div className="spinner" />
                <h2>Loading postcode districts…</h2>
                <p>Getting your UK territory workspace ready.</p>
              </>
            )}
          </section>
        )}
        <div className="workspace-sidebar" hidden={radius !== null}>
          <TerritorySidebar
            markerCounts={locations ? markerCounts : null}
            locationPanel={
              <LocationLayerPanel
                layer={locations}
                onChange={setLocations}
                mapReady={!!boundaries}
                onZoom={() => {
                  if (locations) setLocations({ ...locations, visible: true });
                  setLocationZoom((value) => value + 1);
                }}
              />
            }
            territories={territories}
            activeId={activeId}
            ready={!!boundaries}
            onSelect={(id) => {
              setDrawingRadius(false);
              setActiveId(id);
            }}
            onCreate={(name, color) => {
              setDrawingRadius(false);
              const id = crypto.randomUUID();
              update([...territories, { id, name, color, districts: [] }]);
              setActiveId(id);
            }}
            onUpdate={(territory) =>
              update(
                territories.map((t) => (t.id === territory.id ? territory : t)),
              )
            }
            onDelete={(id) => {
              update(territories.filter((t) => t.id !== id));
              if (activeId === id) setActiveId(null);
            }}
          />
        </div>
        {radius && (
          <RadiusResults
            onChoroplethChange={setChoropleth}
            selection={radius}
            onClose={() => {
              setRadius(null);
              setDrawingRadius(false);
            }}
          />
        )}
      </main>
    </div>
  );
}
