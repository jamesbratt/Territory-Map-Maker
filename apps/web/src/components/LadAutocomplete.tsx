import { useEffect, useState } from "react";
import { Box, Button, FormControl, FormLabel, Input, Stack, Text } from "@chakra-ui/react";
import { getLads, type Lad } from "../lib/api";

export function LadAutocomplete({ value, onChange, disabled }: {
  value: Lad | null; onChange: (lad: Lad | null) => void; disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Lad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (value) return;
    const controller = new AbortController();
    setLoading(true);
    setOptions([]);
    setError("");
    const timer = setTimeout(() => {
      getLads(query, controller.signal).then(lads => {
        if (!controller.signal.aborted) setOptions(lads);
      }).catch(error => {
        if (!controller.signal.aborted) setError(error.message);
      }).finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, value]);
  const choose = (lad: Lad) => { onChange(lad); setQuery(lad.name); setActive(-1); };
  return <FormControl>
    <FormLabel htmlFor="lad-search">Local authority district (LAD)</FormLabel>
    <Input id="lad-search" role="combobox" autoComplete="off" value={query}
      isDisabled={disabled} placeholder="Search by district name or code"
      aria-autocomplete="list" aria-expanded={!value} aria-controls="lad-options"
      aria-activedescendant={active >= 0 ? `lad-option-${active}` : undefined}
      onChange={event => { setQuery(event.target.value); onChange(null); setActive(-1); }}
      onKeyDown={event => {
        if (event.key === "ArrowDown") { event.preventDefault(); setActive(i => Math.min(i + 1, options.length - 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
        if (event.key === "Enter" && active >= 0 && options[active]) { event.preventDefault(); choose(options[active]); }
      }} />
    {!value && <Box mt={2}>
      <Text role="status" fontSize="sm">{loading ? "Loading districts…" : error || (options.length === 0 ? "No districts found." : "Select a district below.")}</Text>
      <Stack id="lad-options" role="listbox" aria-label="Districts" maxH="240px" overflowY="auto" spacing={0}>
        {options.map((lad, index) => <Button key={lad.code} id={`lad-option-${index}`}
          role="option" aria-selected={active === index} variant="ghost" justifyContent="start"
          bg={active === index ? "brand.50" : undefined} isDisabled={disabled}
          onClick={() => choose(lad)}>{lad.name} ({lad.code})</Button>)}
      </Stack>
    </Box>}
  </FormControl>;
}
