import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  getCensusSignals,
  getDistrictCensus,
  POPULATION_SIGNAL,
  type CensusSignal,
  type CensusResponse,
} from "../lib/demographics";
import type { RadiusSelection } from "../lib/radius";
import { createChoropleth, type CensusChoropleth } from "../lib/choropleth";

type Props = {
  selection: RadiusSelection;
  onClose: () => void;
  onChoroplethChange: (data: CensusChoropleth | null) => void;
};
export function RadiusResults({ selection, onClose, onChoroplethChange }: Props) {
  const [signals, setSignals] = useState<CensusSignal[]>([POPULATION_SIGNAL]);
  const [selectedSignal, setSelectedSignal] = useState("population");
  const [selectedVariable, setSelectedVariable] = useState("");
  const resultSelection = useRef<RadiusSelection | null>(null);
  const [catalogueError, setCatalogueError] = useState("");
  const [catalogueAttempt, setCatalogueAttempt] = useState(0);
  const [result, setResult] = useState<CensusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const infoId = useId();
  const title = useRef<HTMLHeadingElement>(null);
  const chosen =
    selectedSignal === "population"
      ? POPULATION_SIGNAL
      : (signals.find((item) => item.key === selectedSignal) ??
        POPULATION_SIGNAL);
  const income = chosen.aggregation === "mean";
  useEffect(() => {
    title.current?.focus();
  }, [selection]);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogueError("");
    getCensusSignals(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setSignals(items);
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setCatalogueError(reason.message);
      });
    return () => controller.abort();
  }, [catalogueAttempt]);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setLoading(true);
    setError("");
    getDistrictCensus(selection, chosen, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          resultSelection.current = selection;
          setResult(data);
          setLoading(false);
        }
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) {
          setError(reason.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [selection, chosen, attempt]);
  const currentResult = resultSelection.current === selection && result?.signal.key === selectedSignal ? result : null;
  const rows = currentResult?.districts ?? [];
  const variables = [...new Map(rows.flatMap((row) => row.metrics).map((metric) => [metric.key, metric.label])).entries()];
  const choropleth = useMemo(() => !loading && !error && currentResult
    ? createChoropleth(selection, currentResult, selectedVariable) : null,
    [selection, currentResult, selectedVariable, loading, error]);
  useEffect(() => { onChoroplethChange(choropleth); }, [choropleth, onChoroplethChange]);
  useEffect(() => () => onChoroplethChange(null), [onChoroplethChange]);
  const format = (value: number | null) =>
    value === null
      ? "—"
      : value.toLocaleString(
          "en-GB",
          income
            ? { style: "currency", currency: "GBP", maximumFractionDigits: 0 }
            : { maximumFractionDigits: 0 },
        );
  return (
    <aside className="sidebar radius-results" aria-label="Radius demographics">
      <div className="sidebar-heading">
        <button className="text-button radius-back" onClick={onClose}>
          ← Back to workspace
        </button>
        <span className="eyebrow">RADIUS EXPLORER</span>
        <h1 ref={title} tabIndex={-1}>
          10 km catchment
        </h1>
        <p>Census signals for postcode districts intersecting your radius.</p>
        <div className="census-label-row">
          <label htmlFor="census-signal">Census signal</label>
          <div
            className="radius-info"
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={(event) => {
              if (!event.currentTarget.contains(document.activeElement))
                setShowInfo(false);
            }}
            onFocus={() => setShowInfo(true)}
            onBlur={() => setShowInfo(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setShowInfo(false);
                event.stopPropagation();
              }
            }}
          >
            <button
              type="button"
              className="radius-info-button"
              aria-label="About census estimates"
              aria-describedby={showInfo ? infoId : undefined}
              onClick={() => setShowInfo(true)}
            >
              <span aria-hidden="true">i</span>
            </button>
            {showInfo && (
              <div id={infoId} className="radius-info-tooltip" role="tooltip">
                <p>
                  {income
                    ? "Estimated annual household income · MSOA income values are averaged using the number of unique district postcodes in each MSOA. This is a postcode-weighted proxy, not a household-weighted average."
                    : `Estimated counts · Each LSOA is split between districts using their share of its postcodes. This assumes the same number of ${chosen.unit} per postcode.`}
                </p>
                <p>
                  {income
                    ? "Values are in pounds per year. The income table does not record a data year."
                    : "Figures are rounded and categories may overlap or include subtotals; do not add every row together."}{" "}
                  Estimates cover whole districts, not just the area inside the
                  circle.
                </p>
              </div>
            )}
          </div>
        </div>
        <select
          id="census-signal"
          className="census-select"
          value={selectedSignal}
          onChange={(event) => {
            setSelectedSignal(event.target.value);
            setSelectedVariable("");
            setResult(null);
            setLoading(true);
            setError("");
          }}
        >
          {signals.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
              {item.geography === "MSOA" ? " (MSOA)" : ""}
            </option>
          ))}
        </select>
        <label className="census-variable-label" htmlFor="census-variable">Census variable</label>
        <select id="census-variable" className="census-select" value={selectedVariable}
          disabled={loading || !!error || !variables.length}
          onChange={(event) => setSelectedVariable(event.target.value)}>
          <option value="">All variables</option>
          {variables.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        {selectedVariable && !loading && !error && <p className="location-note">Map colours show the selected variable’s estimated {income ? 'annual income' : chosen.unit}. Darker districts have higher values.</p>}
        {catalogueError && (
          <div className="age-partial" role="alert">
            {catalogueError}{" "}
            <button
              className="text-button"
              onClick={() => setCatalogueAttempt((value) => value + 1)}
            >
              Retry signals
            </button>
          </div>
        )}
      </div>
      <div className="radius-districts" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <p role="status">Loading {chosen.label.toLowerCase()}…</p>
        ) : error ? (
          <>
            <p role="alert">{error}</p>
            <button
              className="primary"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Try again
            </button>
          </>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <h2>No districts in this radius</h2>
            <p>
              Move the radius over an area covered by the postcode boundaries.
            </p>
          </div>
        ) : (
          rows.map((row) => (
            <article className="radius-district" key={row.district}>
              <h2>
                {row.district}
                <span>{row.year ?? "Year not recorded"}</span>
              </h2>
              <p className="age-coverage">
                {row.matchedAreaCount} of {row.linkedAreaCount} linked{" "}
                {chosen.geography}s have data
              </p>
              {row.status === "no-mapping" ? (
                <p className="age-coverage">
                  No postcode-to-{chosen.geography} mapping is available for
                  this district.
                </p>
              ) : row.status === "no-data" ? (
                <p className="age-coverage">
                  No {chosen.label.toLowerCase()} data is available for these
                  linked areas{row.year ? ` in ${row.year}` : ""}.
                </p>
              ) : (
                <>
                  {!income && !selectedVariable && (
                    <div className="age-population">
                      <span>
                        Estimated {chosen.totalLabel.toLowerCase()}
                        {row.status === "partial" ? " (partial)" : ""}
                      </span>
                      <strong>{format(row.total)}</strong>
                    </div>
                  )}
                  {row.status === "partial" && (
                    <p className="age-partial">
                      Partial coverage: {row.missingAreaCount} linked{" "}
                      {chosen.geography}s are missing data.{" "}
                      {income
                        ? "The average uses only areas with income data."
                        : "Estimates include only available areas."}
                    </p>
                  )}
                  <table className="age-table">
                    <caption>
                      {chosen.label} estimates for {row.district}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">{income ? "Measure" : "Category"}</th>
                        <th scope="col">
                          {income ? "£ / year" : `Est. ${chosen.unit}`}
                        </th>
                        {!income && <th scope="col">Share</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {row.metrics.filter((metric) => !selectedVariable || metric.key === selectedVariable).map((metric) => (
                        <tr key={metric.key}>
                          <th scope="row">{metric.label}</th>
                          <td>{format(metric.value)}</td>
                          {!income && (
                            <td>
                              {metric.percentage === null
                                ? "—"
                                : `${metric.percentage}%`}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
