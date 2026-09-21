import { useEffect, useRef, useState } from 'react';
import { uploadLocations } from '../lib/api';
import { isMappedLocation, readCsvHeaders, type LocationLayer } from '../lib/locations';

type Props = { layer: LocationLayer | null; onChange: (layer: LocationLayer | null) => void; onZoom: () => void; mapReady: boolean };
export function LocationLayerPanel({ layer, onChange, onZoom, mapReady }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [postcode, setPostcode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => { request.current?.abort(); revision.current++; }, []);
  async function chooseFile(selected: File | undefined) {
    const current = ++revision.current;
    setFile(null); setHeaders([]); setPostcode(''); setError(''); setReading(false);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.csv')) { setError('Choose a CSV file.'); return; }
    if (selected.size > 5 * 1024 * 1024) { setError('CSV file must be 5 MB or smaller.'); return; }
    setReading(true);
    try {
      const columns = readCsvHeaders(await selected.text());
      if (revision.current !== current) return;
      if (!columns.length) throw new Error('The file needs a header row with unique column names.');
      setHeaders(columns);
      setPostcode(columns.find((header) => /^(postcode|post code|postal code|postalcode)$/i.test(header)) ?? columns[0]);
      setFile(selected);
    } catch (reason) { if (revision.current === current) setError(reason instanceof Error ? reason.message : 'Unable to read the CSV file.'); }
    finally { if (revision.current === current) setReading(false); }
  }
  const mapped = layer?.rows.filter(isMappedLocation).length ?? 0;
  const unmatched = layer?.rows.filter((row) => !isMappedLocation(row)) ?? [];
  return <details className="location-panel" open>
    <summary><span className="location-symbol" aria-hidden="true">●</span> Customer / sales locations {layer && <span className="location-count">{mapped}</span>}</summary>
    <p className="location-help">Overlay postcode markers on your territories. CSV up to 5 MB; first 1,000 data rows.</p>
    {layer && <div className="location-current">
      <div className="location-layer-title"><strong title={layer.name}>{layer.name}</strong><label className="visibility-toggle"><input type="checkbox" checked={layer.visible} onChange={(e) => onChange({ ...layer, visible: e.target.checked })} />Show</label></div>
      <p role="status">{mapped} mapped · {unmatched.length} unmatched{layer.skipped > 0 ? ` · ${layer.skipped.toLocaleString('en-GB')} rows beyond the limit were not processed` : ''}</p>
      {mapped === 0 && <p className="location-warning">No matching coordinates found. Check your postcodes or upload a different file.</p>}
      {unmatched.length > 0 && <details className="unmatched-list"><summary>Review unmatched postcodes</summary><ul>{unmatched.map((row) => <li key={row.row}>Row {row.row}: {row.postcode}</li>)}</ul></details>}
      <div className="location-actions"><button type="button" className="text-button" disabled={!mapped || !mapReady} onClick={onZoom}>Zoom to locations</button><button type="button" className="text-button" disabled={busy} onClick={() => onChange(null)}>Remove layer</button></div>
    </div>}
    <form onSubmit={async (event) => {
      event.preventDefault(); if (!file || !postcode || busy) return;
      const controller = new AbortController(); request.current = controller;
      setBusy(true); setError('');
      try {
        const result = await uploadLocations(file, postcode, controller.signal);
        if (controller.signal.aborted) return;
        onChange({ name: file.name, ...result, visible: true });
        setFile(null); setHeaders([]); setPostcode('');
        if (input.current) input.current.value = '';
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Upload failed. Please try again.'); }
      finally { if (!controller.signal.aborted) { setBusy(false); request.current = null; } }
    }}>
      <label htmlFor="location-file">{layer ? 'Replace location layer' : 'Add a location layer'}</label>
      <input ref={input} id="location-file" type="file" accept=".csv,text/csv" disabled={busy} onChange={(e) => void chooseFile(e.target.files?.[0])} aria-describedby="location-upload-note" />
      {!!headers.length && <><label htmlFor="location-postcode">Postcode column</label><select id="location-postcode" value={postcode} disabled={busy} onChange={(e) => setPostcode(e.target.value)}>{headers.map((header) => <option key={header}>{header}</option>)}</select></>}
      {error && <p className="location-error" role="alert">{error}</p>}
      {reading && <p role="status">Reading CSV headers…</p>}
      <div className="location-actions"><button className="primary" disabled={!file || !postcode || busy || reading}>{busy ? 'Finding locations…' : layer ? 'Replace markers' : 'Add markers'}</button>{busy && <button type="button" className="text-button" onClick={() => { request.current?.abort(); request.current = null; setBusy(false); }}>Cancel</button>}</div>
      <p className="location-note" id="location-upload-note">Locations stay in this browser tab until you refresh. Markers use postcode coordinates; locations sharing a postcode overlap.</p>
    </form>
  </details>;
}
