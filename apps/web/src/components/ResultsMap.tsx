import { Box, HStack, Stack, Text } from "@chakra-ui/react";
import {
  type ExpressionSpecification,
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
} from "maplibre-gl";
import { useEffect, useRef } from "react";

export const SEGMENT_RANKS = [
  "top 10%",
  "top 20%",
  "top 30%",
  "top 40%",
  "top 50%",
  "40-50%",
  "30-40%",
  "20-30%",
  "10-20%",
  "bottom 10%",
] as const;

export const SEGMENT_RANK_COLORS: Record<(typeof SEGMENT_RANKS)[number], string> = {
  "top 10%": "#166534",
  "top 20%": "#22c55e",
  "top 30%": "#84cc16",
  "top 40%": "#a3e635",
  "top 50%": "#facc15",
  "40-50%": "#fbbf24",
  "30-40%": "#fb923c",
  "20-30%": "#f97316",
  "10-20%": "#ef4444",
  "bottom 10%": "#991b1b",
};

const SEGMENT_RANK_COLOR_EXPRESSION: ExpressionSpecification = [
  "match",
  ["get", "rank"],
  "top 10%",
  SEGMENT_RANK_COLORS["top 10%"],
  "top 20%",
  SEGMENT_RANK_COLORS["top 20%"],
  "top 30%",
  SEGMENT_RANK_COLORS["top 30%"],
  "top 40%",
  SEGMENT_RANK_COLORS["top 40%"],
  "top 50%",
  SEGMENT_RANK_COLORS["top 50%"],
  "40-50%",
  SEGMENT_RANK_COLORS["40-50%"],
  "30-40%",
  SEGMENT_RANK_COLORS["30-40%"],
  "20-30%",
  SEGMENT_RANK_COLORS["20-30%"],
  "10-20%",
  SEGMENT_RANK_COLORS["10-20%"],
  "bottom 10%",
  SEGMENT_RANK_COLORS["bottom 10%"],
  "#64748b",
];

type ResultsMapProps = {
  mapStyleUrl: string;
  results: Record<string, unknown>[];
};

export function ResultsMap({ mapStyleUrl, results }: ResultsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const features = results.flatMap((result, rowIndex) => {
      const latitude = Number(result.lat);
      const longitude = Number(result.long);

      if (
        result.lat === null ||
        result.lat === undefined ||
        result.lat === "" ||
        result.long === null ||
        result.long === undefined ||
        result.long === "" ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return [];
      }

      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [longitude, latitude],
          },
          properties: {
            rowIndex,
            postcode: String(result.postcode ?? ""),
            rank: String(result.segment_affinity_rank ?? "").toLowerCase(),
          },
        },
      ];
    });

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: mapStyleUrl,
      center: [-2.7, 52.6],
      zoom: 5.4,
    });

    map.addControl(new NavigationControl(), "top-right");
    map.on("load", () => {
      map.addSource("results", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });
      map.addLayer({
        id: "result-dots",
        type: "circle",
        source: "results",
        paint: {
          "circle-color": SEGMENT_RANK_COLOR_EXPRESSION,
          "circle-opacity": 0.78,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 12, 7],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.8,
          "circle-stroke-width": 1,
        },
      });

      if (features.length > 0) {
        const bounds = features.reduce(
          (resultBounds, feature) =>
            resultBounds.extend(feature.geometry.coordinates as [number, number]),
          new LngLatBounds(),
        );
        map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
      }
    });

    return () => map.remove();
  }, [mapStyleUrl, results]);

  return (
    <Box
      borderWidth="1px"
      h="full"
      minH="320px"
      overflow="hidden"
      position="relative"
      rounded="xl"
      w="full"
    >
      <Box h="full" minH="320px" ref={mapContainerRef} w="full" />
      <Box
        bg="whiteAlpha.900"
        bottom={3}
        boxShadow="sm"
        left={3}
        maxH="210px"
        overflowY="auto"
        p={3}
        position="absolute"
        rounded="md"
        zIndex={1}
      >
        <Text fontSize="xs" fontWeight="bold" mb={2}>
          Segment affinity rank
        </Text>
        <Stack spacing={1}>
          {SEGMENT_RANKS.map((rank) => (
            <HStack key={rank} spacing={2}>
              <Box
                bg={SEGMENT_RANK_COLORS[rank]}
                borderRadius="full"
                boxSize="10px"
              />
              <Text fontSize="xs">{rank}</Text>
            </HStack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
