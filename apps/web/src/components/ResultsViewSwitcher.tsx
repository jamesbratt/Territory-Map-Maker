import { Button, ButtonGroup, Icon } from "@chakra-ui/react";

function AudienceIcon() {
  return (
    <Icon fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Icon>
  );
}

function AreaIcon() {
  return (
    <Icon fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Icon>
  );
}

export type ResultsView = "results" | "areas";

type ResultsViewSwitcherProps = {
  value: ResultsView;
  onChange: (view: ResultsView) => void;
};

export function ResultsViewSwitcher({
  value,
  onChange,
}: ResultsViewSwitcherProps) {
  return (
    <ButtonGroup isAttached size="sm" variant="outline">
      <Button
        colorScheme={value === "results" ? "brand" : "gray"}
        leftIcon={<AudienceIcon />}
        onClick={() => onChange("results")}
        variant={value === "results" ? "solid" : "outline"}
      >
        Audience
      </Button>
      <Button
        colorScheme={value === "areas" ? "brand" : "gray"}
        leftIcon={<AreaIcon />}
        onClick={() => onChange("areas")}
        variant={value === "areas" ? "solid" : "outline"}
      >
        Area
      </Button>
    </ButtonGroup>
  );
}
