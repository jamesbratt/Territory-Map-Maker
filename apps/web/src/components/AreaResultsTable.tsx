import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Select,
  SimpleGrid,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Text,
  Tr,
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { useEffect, useMemo, useState } from "react";
import {
  ResultsMap,
  SEGMENT_RANK_COLORS,
  SEGMENT_RANKS,
} from "./ResultsMap";

const RESULTS_PER_PAGE = 10;

type AreaResultsTableProps = {
  mapStyleUrl: string;
  results: Record<string, unknown>[];
  personaName: string | null;
};

type AreaSummary = {
  area: string;
  count: number;
  rankCounts: Map<string, number>;
};

type SortKey = "count" | "area" | (typeof SEGMENT_RANKS)[number];

function formatCsvCell(value: string | number): string {
  const serialized = String(value);
  const safeValue = /^[=+\-@]/.test(serialized) ? `'${serialized}` : serialized;

  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function AreaResultsTable({
  mapStyleUrl,
  results,
  personaName,
}: AreaResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const areaSummaries = useMemo(() => {
    const summaries = new Map<string, AreaSummary>();

    for (const result of results) {
      const area =
        typeof result.lad25nm === "string" && result.lad25nm.trim().length > 0
          ? result.lad25nm
          : "Unknown area";
      const rank =
        typeof result.segment_affinity_rank === "string"
          ? result.segment_affinity_rank.toLowerCase()
          : null;
      const summary = summaries.get(area) ?? {
        area,
        count: 0,
        rankCounts: new Map<string, number>(),
      };

      summary.count += 1;
      if (rank) {
        summary.rankCounts.set(rank, (summary.rankCounts.get(rank) ?? 0) + 1);
      }
      summaries.set(area, summary);
    }

    return [...summaries.values()];
  }, [results]);
  const sortedAreaSummaries = useMemo(
    () =>
      [...areaSummaries].sort((first, second) => {
        if (sortKey === "area") {
          return first.area.localeCompare(second.area);
        }

        if (sortKey === "count") {
          return second.count - first.count || first.area.localeCompare(second.area);
        }

        const firstPercentage =
          (first.rankCounts.get(sortKey) ?? 0) / first.count;
        const secondPercentage =
          (second.rankCounts.get(sortKey) ?? 0) / second.count;

        return (
          secondPercentage - firstPercentage ||
          first.area.localeCompare(second.area)
        );
      }),
    [areaSummaries, sortKey],
  );
  const areaStats = useMemo(() => {
    const getRankShare = (summary: AreaSummary, ranks: readonly string[]) =>
      (ranks.reduce(
        (total, rank) => total + (summary.rankCounts.get(rank) ?? 0),
        0,
      ) /
        summary.count) *
      100;
    const byCount = [...areaSummaries].sort(
      (first, second) =>
        second.count - first.count || first.area.localeCompare(second.area),
    );
    const byTopTenShare = [...areaSummaries].sort(
      (first, second) =>
        getRankShare(second, ["top 10%"]) -
          getRankShare(first, ["top 10%"]) ||
        first.area.localeCompare(second.area),
    );
    const highAffinityRanks = ["top 10%", "top 20%", "top 30%"];
    const byHighAffinityShare = [...areaSummaries].sort(
      (first, second) =>
        getRankShare(second, highAffinityRanks) -
          getRankShare(first, highAffinityRanks) ||
        first.area.localeCompare(second.area),
    );
    const getHighAffinityCount = (summary: AreaSummary) =>
      highAffinityRanks.reduce(
        (total, rank) => total + (summary.rankCounts.get(rank) ?? 0),
        0,
      );
    const byHighAffinityCount = [...areaSummaries].sort(
      (first, second) =>
        getHighAffinityCount(second) - getHighAffinityCount(first) ||
        getRankShare(second, highAffinityRanks) -
          getRankShare(first, highAffinityRanks) ||
        first.area.localeCompare(second.area),
    );
    return [
      {
        label: "Top area by count",
        value: byCount[0]?.area ?? "—",
        detail: byCount[0] ? `${byCount[0].count} rows` : "No results",
      },
      {
        label: "Highest Top 10% share",
        value: byTopTenShare[0]?.area ?? "—",
        detail: byTopTenShare[0]
          ? `${getRankShare(byTopTenShare[0], ["top 10%"]).toFixed(1)}%`
          : "No results",
      },
      {
        label: "Highest Top 30% share",
        value: byHighAffinityShare[0]?.area ?? "—",
        detail: byHighAffinityShare[0]
          ? `${getRankShare(byHighAffinityShare[0], highAffinityRanks).toFixed(1)}%`
          : "No results",
      },
      {
        label: "Largest high-affinity audience",
        value: byHighAffinityCount[0]?.area ?? "—",
        detail: byHighAffinityCount[0]
          ? `${getHighAffinityCount(byHighAffinityCount[0]).toLocaleString()} Top 30% rows · ${getRankShare(byHighAffinityCount[0], highAffinityRanks).toFixed(1)}% of area`
          : "No results",
      },
    ];
  }, [areaSummaries]);
  const totalPages = Math.max(
    1,
    Math.ceil(sortedAreaSummaries.length / RESULTS_PER_PAGE),
  );
  const pageStart = (currentPage - 1) * RESULTS_PER_PAGE;
  const pagedAreaSummaries = sortedAreaSummaries.slice(
    pageStart,
    pageStart + RESULTS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [results, sortKey]);

  const exportCsv = () => {
    const headers = ["Area", "Count", ...SEGMENT_RANKS];
    const rows = sortedAreaSummaries.map((summary) => [
      summary.area,
      summary.count,
      ...SEGMENT_RANKS.map((rank) =>
        (
          ((summary.rankCounts.get(rank) ?? 0) / summary.count) *
          100
        ).toFixed(1),
      ),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(formatCsvCell).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");

    link.href = url;
    link.download = "segment-area-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <SimpleGrid
        columns={{ base: 1, lg: 2 }}
        mb={8}
        spacing={{ base: 4, lg: 8 }}
      >
        <Box bg="white" borderWidth="1px" minH="320px" rounded="xl">
          <Box borderBottomWidth="1px" p={{ base: 5, md: 6 }}>
            <Text
              color="brand.600"
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              Audience
            </Text>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} mt={1}>
              {personaName ?? "Selected audience"}
            </Heading>
          </Box>
          <Box p={{ base: 5, md: 6 }}>
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              {areaStats.map((stat) => (
                <Box
                  bg="gray.50"
                  borderWidth="1px"
                  key={stat.label}
                  p={4}
                  rounded="lg"
                >
                  <Text color="gray.500" fontSize="xs" fontWeight="semibold">
                    {stat.label}
                  </Text>
                  <Text fontSize="sm" fontWeight="bold" mt={1}>
                    {stat.value}
                  </Text>
                  <Text color="brand.700" fontSize="sm" mt={1}>
                    {stat.detail}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        </Box>
        <ResultsMap mapStyleUrl={mapStyleUrl} results={results} />
      </SimpleGrid>

      <Flex
        align={{ base: "stretch", sm: "end" }}
        direction={{ base: "column", sm: "row" }}
        gap={3}
        justify="space-between"
        mb={4}
      >
        <FormControl maxW={{ sm: "260px" }}>
          <FormLabel fontSize="sm" mb={1}>
            Sort areas
          </FormLabel>
          <Select
            bg="white"
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            value={sortKey}
          >
            <option value="count">Row count</option>
            <option value="area">Area name</option>
            {SEGMENT_RANKS.map((rank) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </Select>
        </FormControl>
        <Button
          alignSelf="flex-end"
          colorScheme="brand"
          flexShrink={0}
          isDisabled={sortedAreaSummaries.length === 0}
          leftIcon={<DownloadIcon />}
          ml="auto"
          onClick={exportCsv}
        >
          Export CSV
        </Button>
      </Flex>

      <TableContainer bg="white" borderWidth="1px" maxW="100%" rounded="xl">
        <Table size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th py={3} whiteSpace="nowrap">
                Area
              </Th>
              <Th isNumeric py={3} whiteSpace="nowrap">
                Count
              </Th>
              {SEGMENT_RANKS.map((rank) => {
                return (
                  <Th isNumeric key={rank} py={3} whiteSpace="nowrap">
                    <HStack justify="flex-end" spacing={2}>
                      <Box
                        bg={SEGMENT_RANK_COLORS[rank]}
                        borderRadius="full"
                        boxSize="10px"
                      />
                      <Text>{rank}</Text>
                    </HStack>
                  </Th>
                );
              })}
            </Tr>
          </Thead>
          <Tbody>
            {pagedAreaSummaries.map((summary) => (
              <Tr key={summary.area}>
                <Td py={3}>{summary.area}</Td>
                <Td isNumeric py={3}>
                  {summary.count}
                </Td>
                {SEGMENT_RANKS.map((rank) => {
                  const percentage =
                    ((summary.rankCounts.get(rank) ?? 0) / summary.count) * 100;

                  return (
                    <Td isNumeric key={rank} p={0}>
                      <Box minW="88px" overflow="hidden" p={3} position="relative">
                        <Box
                          bg={SEGMENT_RANK_COLORS[rank]}
                          bottom={0}
                          left={0}
                          opacity={0.22}
                          position="absolute"
                          top={0}
                          width={`${percentage}%`}
                        />
                        <Text fontWeight="semibold" position="relative">
                          {percentage.toFixed(1)}%
                        </Text>
                      </Box>
                    </Td>
                  );
                })}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {areaSummaries.length > 0 && (
        <Flex
          align="center"
          direction={{ base: "column", sm: "row" }}
          gap={3}
          justify="space-between"
          mt={4}
        >
          <Text color="gray.600" fontSize="sm">
            Showing {pageStart + 1}–
            {Math.min(pageStart + RESULTS_PER_PAGE, areaSummaries.length)} of{" "}
            {areaSummaries.length}
          </Text>
          <HStack>
            <Button
              isDisabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => page - 1)}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <HStack spacing={2}>
              <Text fontSize="sm">Page</Text>
              <Select
                aria-label="Select area results page"
                onChange={(event) => setCurrentPage(Number(event.target.value))}
                size="sm"
                value={currentPage}
                w="72px"
              >
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1;

                  return (
                    <option key={page} value={page}>
                      {page}
                    </option>
                  );
                })}
              </Select>
              <Text fontSize="sm" whiteSpace="nowrap">
                of {totalPages}
              </Text>
            </HStack>
            <Button
              isDisabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => page + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </HStack>
        </Flex>
      )}
    </Box>
  );
}
