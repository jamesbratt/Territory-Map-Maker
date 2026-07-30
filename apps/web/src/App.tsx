import { ArrowForwardIcon, AtSignIcon, DownloadIcon } from "@chakra-ui/icons";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type ExpressionSpecification,
  LngLatBounds,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ApiStatus } from "./components/ApiStatus";
import { uploadCsv } from "./lib/api";

const RESULTS_PER_PAGE = 10;
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`);

const MAPTILER_API_KEY = "rvEdtOdLKbADHjJHzejJ";
const MAP_STYLE_URL = `https://api.maptiler.com/maps/base-v4/style.json?key=${MAPTILER_API_KEY}`;
const SEGMENT_RANK_ORDER = [
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
];
const SEGMENT_RANK_COLORS: Record<string, string> = {
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
const UNRANKED_COLOR = "#64748b";
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
  UNRANKED_COLOR,
];

function getAffinityColor(score: number): string {
  if (score >= 80) return "green";
  if (score >= 60) return "teal";
  if (score >= 40) return "blue";
  if (score >= 20) return "orange";
  return "red";
}

function formatCsvCell(value: unknown): string {
  const serialized =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  const safeValue = /^[=+\-@]/.test(serialized) ? `'${serialized}` : serialized;

  return `"${safeValue.replaceAll('"', '""')}"`;
}

function getCensusDetails(row: Record<string, unknown>) {
  if (!Array.isArray(row.censusValues)) return [];

  return row.censusValues
    .filter(
      (entry): entry is Record<string, unknown> =>
        typeof entry === "object" && entry !== null,
    )
    .map((entry) => {
      const friendlyLabelEntry = Object.entries(entry).find(([key]) =>
        key.endsWith("_friendly_label"),
      );
      const affinityEntry = Object.entries(entry).find(([key]) =>
        key.endsWith("_affinity"),
      );
      const rankEntry = Object.entries(entry).find(([key]) =>
        key.endsWith("_rank"),
      );
      const categoryEntry = Object.entries(entry).find(([key]) =>
        key.endsWith("_category_name"),
      );
      const valueEntry = Object.entries(entry).find(
        ([key]) =>
          !key.endsWith("_friendly_label") &&
          !key.endsWith("_category_name") &&
          !key.endsWith("_affinity") &&
          !key.endsWith("_rank"),
      );

      return {
        label: String(
          friendlyLabelEntry?.[1] ?? valueEntry?.[0] ?? "Census value",
        ),
        value: valueEntry?.[1],
        affinity: affinityEntry?.[1],
        rank: rankEntry?.[1],
        category: categoryEntry?.[1],
      };
    });
}

const personas = [
  {
    id: "young-professionals",
    name: "Young professionals",
    description: "Career-focused adults living in well-connected urban areas.",
    variables: [
      "age_25_34",
      "higher_managerial_professional",
      "qualification_level_4_plus",
      "private_rented_total",
    ],
  },
  {
    id: "growing-families",
    name: "Growing families",
    description: "Households with dependent children and family-focused needs.",
    variables: [
      "age_35_44",
      "single_family_household_married_civil_partnership_dependent_children",
      "owned_mortgage_or_loan",
      "two_cars_or_vans",
    ],
  },
  {
    id: "affluent-homeowners",
    name: "Affluent homeowners",
    description:
      "Established, high-value households with strong spending power.",
    variables: [
      "age_45_54",
      "higher_managerial_professional",
      "owned_outright",
      "detached",
    ],
  },
  {
    id: "students-urbanites",
    name: "Students & urbanites",
    description: "Young adults studying and living in dense urban communities.",
    variables: [
      "age_18_24",
      "full_time_students",
      "purpose_built_flat",
      "no_cars_or_vans",
    ],
  },
  {
    id: "active-retirees",
    name: "Active retirees",
    description: "Older, settled households with time and disposable income.",
    variables: [
      "age_65_74",
      "age_75_plus",
      "inactive_retired",
      "owned_outright",
    ],
  },
] as const;

const howItWorksSteps = [
  {
    number: "01",
    title: "Upload data and choose a persona",
    description:
      "Choose a CSV containing your customer postcodes, then select the audience persona you want to find. Your original columns stay intact.",
  },
  {
    number: "02",
    title: "Understand your affinity score",
    description:
      "Each customer gets a 0–100 score based on their postcode’s census signals. Higher scores indicate a stronger persona match, while the rank compares them with the rest of your data.",
  },
  {
    number: "03",
    title: "Export your enriched data",
    description:
      "Download an enriched CSV containing affinity scores and audience insights, ready to use in your CRM, mailing lists, campaign planning, or further analysis.",
  },
] as const;

const frequentlyAskedQuestions = [
  {
    question: "What data do I need to upload?",
    answer:
      "Upload a CSV containing a column of UK postcodes. Your file can include any additional customer fields you need, and those original columns will be preserved in the enriched export.",
  },
  {
    question: "Are there any file or row limits?",
    answer:
      "Yes. Uploads must be CSV files no larger than 5 MB. We process the first 1,000 non-empty data rows in each file, so any additional rows will be ignored.",
  },
  {
    question: "How is the affinity score calculated?",
    answer:
      "Each postcode is matched with relevant UK census signals for your chosen persona. Those signals are converted into percentiles and averaged into a score from 0 to 100, where a higher score indicates a stronger match.",
  },
  {
    question: "Does an affinity score describe an individual?",
    answer:
      "No. An affinity score reflects the demographic characteristics of the small, highly granular census area associated with a postcode. It indicates how strongly that local area matches the selected persona, but should not be treated as a statement or prediction about any individual person or household.",
  },
  {
    question: "What happens to my uploaded data?",
    answer:
      "Your file is used to produce the segmentation results shown in the app. Avoid uploading unnecessary personal or sensitive information; a postcode and your own non-sensitive reference fields are enough. Your data is not stored or shared, and is deleted after processing.",
  },
  {
    question: "Can I use the results in other tools?",
    answer:
      "Yes. You can download the enriched results as a CSV and use them in your CRM, campaign planning, mailing workflow, or analytics tools.",
  },
  {
    question: "Which UK areas are supported?",
    answer:
      "Segmentbase is designed for valid UK postcodes that can be matched to the available Office for National Statistics census geography and demographic data. Data for Scotland and Northern Ireland is currently not available, but will be coming soon.",
  },
] as const;

export default function App() {
  const currentYear = new Date().getFullYear();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postcodeInputRef = useRef<HTMLInputElement>(null);
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollToResultsRef = useRef(false);
  const personaModal = useDisclosure();
  const detailModal = useDisclosure();
  const [postcodeColumn, setPostcodeColumn] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [resultsPersonaName, setResultsPersonaName] = useState<string | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadRows, setUploadRows] = useState<Record<string, unknown>[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<
    "none" | "ascending" | "descending"
  >("none");
  const [rankFilter, setRankFilter] = useState("all");
  const [selectedResultRow, setSelectedResultRow] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const resultColumns = useMemo(() => {
    const fields = new Set(uploadRows.flatMap((row) => Object.keys(row)));
    fields.delete("segment");
    fields.delete("segment_affinity_rank");
    fields.delete("segment_affinity_score");
    fields.delete("censusValues");
    fields.delete("lsoa_id");
    fields.delete("geography");
    fields.delete("geography_code");
    fields.delete("postcode");

    return [
      "segment",
      "segment_affinity_rank",
      "segment_affinity_score",
      ...fields,
    ];
  }, [uploadRows]);

  const rankOptions = useMemo(
    () =>
      [
        ...new Set(
          uploadRows
            .map((row) => row.segment_affinity_rank)
            .filter(
              (rank): rank is string =>
                typeof rank === "string" && rank.length > 0,
            ),
        ),
      ].sort((first, second) => {
        const firstIndex = SEGMENT_RANK_ORDER.indexOf(first.toLowerCase());
        const secondIndex = SEGMENT_RANK_ORDER.indexOf(second.toLowerCase());

        if (firstIndex === -1 && secondIndex === -1) {
          return first.localeCompare(second);
        }
        if (firstIndex === -1) return 1;
        if (secondIndex === -1) return -1;
        return firstIndex - secondIndex;
      }),
    [uploadRows],
  );
  const filteredRows = useMemo(
    () =>
      rankFilter === "all"
        ? uploadRows
        : uploadRows.filter(
            (row) => String(row.segment_affinity_rank) === rankFilter,
          ),
    [rankFilter, uploadRows],
  );
  const audienceSummary = useMemo(() => {
    const scoredRows = uploadRows
      .map((row) => ({
        row,
        score: Number(row.segment_affinity_score),
      }))
      .filter(({ score }) => Number.isFinite(score));
    const averageScore =
      scoredRows.length > 0
        ? scoredRows.reduce((total, { score }) => total + score, 0) /
          scoredRows.length
        : null;
    const highAffinityCount = scoredRows.filter(
      ({ score }) => score >= 60,
    ).length;
    const primeProspectCount = scoredRows.filter(
      ({ score }) => score >= 80,
    ).length;
    const strongestResult = scoredRows.reduce<
      (typeof scoredRows)[number] | null
    >(
      (strongest, result) =>
        strongest === null || result.score > strongest.score
          ? result
          : strongest,
      null,
    );
    const strongestLocation =
      strongestResult?.row.geography ??
      strongestResult?.row.postcode ??
      strongestResult?.row.geography_code;

    return {
      averageScore,
      highAffinityCount,
      highAffinityPercentage:
        scoredRows.length > 0
          ? Math.round((highAffinityCount / scoredRows.length) * 100)
          : 0,
      primeProspectCount,
      primeProspectPercentage:
        scoredRows.length > 0
          ? Math.round((primeProspectCount / scoredRows.length) * 100)
          : 0,
      strongestLocation:
        strongestLocation == null ? "Not available" : String(strongestLocation),
      strongestScore: strongestResult?.score ?? null,
    };
  }, [uploadRows]);
  const totalPages = Math.ceil(filteredRows.length / RESULTS_PER_PAGE);
  const pageStart = (currentPage - 1) * RESULTS_PER_PAGE;
  const sortedRows = useMemo(() => {
    if (sortOrder === "none") return filteredRows;

    return [...filteredRows].sort((first, second) => {
      const firstValue = first.segment_affinity_score;
      const secondValue = second.segment_affinity_score;
      const firstScore = firstValue == null ? Number.NaN : Number(firstValue);
      const secondScore =
        secondValue == null ? Number.NaN : Number(secondValue);
      const firstHasScore = Number.isFinite(firstScore);
      const secondHasScore = Number.isFinite(secondScore);

      if (!firstHasScore && !secondHasScore) return 0;
      if (!firstHasScore) return 1;
      if (!secondHasScore) return -1;

      return sortOrder === "ascending"
        ? firstScore - secondScore
        : secondScore - firstScore;
    });
  }, [filteredRows, sortOrder]);
  const pagedRows = useMemo(
    () => sortedRows.slice(pageStart, pageStart + RESULTS_PER_PAGE),
    [pageStart, sortedRows],
  );
  const selectedCensusDetails = useMemo(
    () => getCensusDetails(selectedResultRow ?? {}),
    [selectedResultRow],
  );
  const selectedScoreValue = selectedResultRow?.segment_affinity_score;
  const selectedScore =
    selectedScoreValue == null ? Number.NaN : Number(selectedScoreValue);
  const selectedHasScore = Number.isFinite(selectedScore);
  const selectedAffinityColor = selectedHasScore
    ? getAffinityColor(selectedScore)
    : "gray";

  useEffect(() => {
    if (!shouldScrollToResultsRef.current || uploadRows.length === 0) return;

    shouldScrollToResultsRef.current = false;
    resultsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [uploadRows]);

  useEffect(() => {
    if (uploadRows.length === 0 || !mapContainerRef.current) return;

    const features = filteredRows.flatMap((row, rowIndex) => {
      if (
        row.lat === null ||
        row.lat === undefined ||
        row.lat === "" ||
        row.long === null ||
        row.long === undefined ||
        row.long === ""
      ) {
        return [];
      }

      const latitude = Number(row.lat);
      const longitude = Number(row.long);

      if (
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
            postcode: String(row.postcode ?? ""),
            rank: String(row.segment_affinity_rank ?? ""),
          },
        },
      ];
    });

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLE_URL,
      center: [-2.7, 52.6],
      zoom: 5.4,
    });

    map.addControl(new NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("upload-rows", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features,
        },
      });
      map.addLayer({
        id: "upload-row-dots",
        type: "circle",
        source: "upload-rows",
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
          (pointBounds, feature) =>
            pointBounds.extend(
              feature.geometry.coordinates as [number, number],
            ),
          new LngLatBounds(),
        );
        map.fitBounds(bounds, {
          padding: 48,
          maxZoom: 13,
          duration: 0,
        });
      }
    });

    return () => map.remove();
  }, [filteredRows, uploadRows.length]);

  const openResultDetails = (row: Record<string, unknown>) => {
    setSelectedResultRow(row);
    detailModal.onOpen();
  };

  const exportVisibleRows = () => {
    if (sortedRows.length === 0) return;

    const csv = [
      resultColumns.map(formatCsvCell).join(","),
      ...sortedRows.map((row) =>
        resultColumns.map((column) => formatCsvCell(row[column])).join(","),
      ),
    ].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "segment-results.csv";
    link.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setPendingFile(file);
    setSelectedPersonaId(null);
    setUploadResult(null);
    personaModal.onOpen();
  };

  const handleModalClose = () => {
    if (isUploading) return;
    setPendingFile(null);
    setSelectedPersonaId(null);
    personaModal.onClose();
  };

  const handleUpload = async () => {
    const persona = personas.find(({ id }) => id === selectedPersonaId);
    if (!pendingFile || !persona) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const rows = await uploadCsv(pendingFile, postcodeColumn.trim(), [
        ...persona.variables,
      ]);
      const rowsWithSegment = rows.map((row) => ({
        segment: persona.name,
        ...row,
      }));
      setUploadResult({
        status: "success",
        message: `${pendingFile.name} uploaded for the ${persona.name} persona. ${rows.length} rows processed.`,
      });
      shouldScrollToResultsRef.current = true;
      setResultsPersonaName(persona.name);
      setUploadRows(rowsWithSegment);
      setCurrentPage(1);
      setRankFilter("all");
      setSelectedResultRow(null);
      setPendingFile(null);
      setSelectedPersonaId(null);
      personaModal.onClose();
    } catch (error) {
      setUploadResult({
        status: "error",
        message: error instanceof Error ? error.message : "The upload failed.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" minH="100vh">
      <Box as="header" bg="white" borderBottomWidth="1px">
        <Container maxW="7xl" py={4}>
          <Flex align="center" justify="space-between">
            <HStack spacing={3}>
              <Flex
                align="center"
                bg="gray.900"
                color="white"
                h={9}
                justify="center"
                rounded="lg"
                w={9}
              >
                <Icon as={AtSignIcon} boxSize={4} />
              </Flex>
              <Heading fontSize="lg" letterSpacing="-0.02em">
                Segmentbase
              </Heading>
            </HStack>
            <ApiStatus />
          </Flex>
        </Container>
      </Box>

      <Container flex="1" maxW="7xl" py={{ base: 10, md: 16 }}>
        <Stack align="center" spacing={6} textAlign="center">
          <Heading
            fontSize={{ base: "4xl", md: "6xl" }}
            letterSpacing="-0.025em"
            lineHeight="1.10"
            maxW="5xl"
          >
            Segment your audience by UK demographics in seconds
          </Heading>
          <Text color="gray.600" fontSize={{ base: "lg", md: "xl" }} maxW="2xl">
            Split your audience data by personas based on age group, household
            type, occupation and more. Get actionable insights to inform your
            marketing strategy and reach the right people.
          </Text>

          <Button
            as="a"
            colorScheme="brand"
            href="#upload"
            onClick={(event) => {
              event.preventDefault();
              postcodeInputRef.current?.focus({ preventScroll: true });
              uploadSectionRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
            rightIcon={<ArrowForwardIcon />}
            size="lg"
          >
            Try now
          </Button>
        </Stack>

        <Box as="section" mt={{ base: 24, md: 32 }}>
          <Box mb={{ base: 8, md: 10 }} textAlign="center">
            <Text
              color="brand.600"
              fontSize="sm"
              fontWeight="semibold"
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              How it works
            </Text>
            <Heading
              fontSize={{ base: "3xl", md: "4xl" }}
              letterSpacing="-0.035em"
              mt={2}
            >
              From spreadsheet to audience insight
            </Heading>
            <Text color="gray.600" fontSize="lg" maxW="2xl" mt={3} mx="auto">
              Turn a simple customer file into clear, actionable audience
              intelligence in three straightforward steps.
            </Text>
          </Box>

          <SimpleGrid
            columns={{ base: 1, lg: 2 }}
            gap={{ base: 6, lg: 8 }}
            h={{ base: "auto", lg: "560px" }}
          >
            <Stack h="full" spacing={4}>
              {howItWorksSteps.map((step) => (
                <Flex
                  bg="white"
                  borderWidth="1px"
                  direction="column"
                  flex="1"
                  justify="center"
                  key={step.number}
                  minH={{ base: "190px", lg: 0 }}
                  p={{ base: 6, md: 7 }}
                  rounded="xl"
                >
                  <HStack align="start" spacing={5}>
                    <Flex
                      align="center"
                      bg="brand.50"
                      color="brand.700"
                      flexShrink={0}
                      fontSize="sm"
                      fontWeight="bold"
                      h={10}
                      justify="center"
                      rounded="full"
                      w={10}
                    >
                      {step.number}
                    </Flex>
                    <Box>
                      <Heading fontSize="xl" letterSpacing="-0.02em">
                        {step.title}
                      </Heading>
                      <Text color="gray.600" lineHeight="tall" mt={2}>
                        {step.description}
                      </Text>
                    </Box>
                  </HStack>
                </Flex>
              ))}
            </Stack>

            <Box
              h={{ base: "380px", md: "500px", lg: "full" }}
              overflow="hidden"
              position="relative"
              rounded="2xl"
            >
              <Image
                alt="Segment audience analytics results"
                h="full"
                objectFit="cover"
                objectPosition="calc(50% + 100px) center"
                src="/images/segmentbase-screen-shot.png"
                w="full"
              />
              <Box
                bgGradient="linear(to-t, blackAlpha.600, transparent)"
                bottom={0}
                left={0}
                position="absolute"
                right={0}
                top="45%"
              />
              <Text
                bottom={7}
                color="white"
                fontSize="lg"
                fontWeight="semibold"
                left={7}
                maxW="sm"
                position="absolute"
                textShadow="0 1px 12px rgba(0, 0, 0, 0.35)"
              >
                See the people and patterns behind every location.
              </Text>
            </Box>
          </SimpleGrid>
        </Box>

        <Box
          as="section"
          id="upload"
          mt={{ base: 24, md: 32 }}
          ref={uploadSectionRef}
          scrollMarginTop={8}
        >
          <Box mb={{ base: 8, md: 10 }} textAlign="center">
            <Text
              color="brand.600"
              fontSize="sm"
              fontWeight="semibold"
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              Get started
            </Text>
            <Heading
              fontSize={{ base: "3xl", md: "4xl" }}
              letterSpacing="-0.035em"
              mt={2}
            >
              Find your audience
            </Heading>
            <Text color="gray.600" fontSize="lg" maxW="2xl" mt={3} mx="auto">
              Upload your customer data to enrich every postcode with census
              insight and audience affinity.
            </Text>
          </Box>

          <Box
            bg="white"
            borderWidth="1px"
            maxW="2xl"
            mx="auto"
            p={{ base: 5, md: 6 }}
            rounded="xl"
            w="full"
          >
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Postcode column</FormLabel>
                <Input
                  onChange={(event) => setPostcodeColumn(event.target.value)}
                  placeholder="Enter your postcode column name, e.g. customer_postcode"
                  ref={postcodeInputRef}
                  value={postcodeColumn}
                />
              </FormControl>

              <Input
                accept=".csv,text/csv"
                display="none"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              <Button
                colorScheme="brand"
                isDisabled={!postcodeColumn.trim()}
                onClick={() => fileInputRef.current?.click()}
                rightIcon={<ArrowForwardIcon />}
                size="lg"
              >
                Choose CSV file
              </Button>

              {uploadResult?.status === "success" && (
                <Alert rounded="md" status="success" variant="subtle">
                  <AlertIcon />
                  <AlertDescription>{uploadResult.message}</AlertDescription>
                </Alert>
              )}
            </Stack>
          </Box>
        </Box>

        {uploadRows.length > 0 && (
          <Box
            display="flex"
            flexDirection="column"
            mt={{ base: 10, md: 14 }}
            ref={resultsSectionRef}
            scrollMarginTop={8}
          >
            <Flex
              align={{ base: "start", sm: "end" }}
              justify="space-between"
              mb={4}
              direction={{ base: "column", lg: "row" }}
              gap={2}
              order={-1}
            >
              <Box>
                <Heading fontSize="2xl">
                  {resultsPersonaName
                    ? `${resultsPersonaName} audience results`
                    : "Audience results"}
                </Heading>
                <Text color="gray.600" mt={1}>
                  {rankFilter === "all"
                    ? `${uploadRows.length} enriched ${
                        uploadRows.length === 1 ? "record" : "records"
                      }`
                    : `${filteredRows.length} of ${uploadRows.length} records`}
                </Text>
              </Box>
              <Stack
                direction={{ base: "column", md: "row" }}
                spacing={3}
                w={{ base: "full", lg: "auto" }}
              >
                <FormControl minW={{ sm: "190px" }}>
                  <FormLabel fontSize="sm" mb={1}>
                    Filter by rank
                  </FormLabel>
                  <Select
                    bg="white"
                    onChange={(event) => {
                      setRankFilter(event.target.value);
                      setCurrentPage(1);
                    }}
                    value={rankFilter}
                  >
                    <option value="all">All ranks</option>
                    {rankOptions.map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl minW={{ sm: "250px" }}>
                  <FormLabel fontSize="sm" mb={1}>
                    Sort results
                  </FormLabel>
                  <Select
                    bg="white"
                    onChange={(event) => {
                      setSortOrder(
                        event.target.value as
                          | "none"
                          | "ascending"
                          | "descending",
                      );
                      setCurrentPage(1);
                    }}
                    value={sortOrder}
                  >
                    <option value="none">No sorting</option>
                    <option value="ascending">
                      Affinity score: low to high
                    </option>
                    <option value="descending">
                      Affinity score: high to low
                    </option>
                  </Select>
                </FormControl>
                <Button
                  alignSelf="end"
                  colorScheme="brand"
                  flexShrink={0}
                  isDisabled={sortedRows.length === 0}
                  leftIcon={<DownloadIcon />}
                  onClick={exportVisibleRows}
                  w={{ base: "full", md: "auto" }}
                  whiteSpace="nowrap"
                >
                  Export CSV
                </Button>
              </Stack>
            </Flex>

            <SimpleGrid
              columns={{ base: 1, lg: 2 }}
              mb={8}
              order={-2}
              spacing={{ base: 4, lg: 8 }}
            >
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                <Box bg="white" borderWidth="1px" p={5} rounded="xl">
                  <Text color="gray.500" fontSize="sm" fontWeight="semibold">
                    Average persona affinity
                  </Text>
                  <Heading fontSize="3xl" mt={2}>
                    {audienceSummary.averageScore === null
                      ? "—"
                      : Math.round(audienceSummary.averageScore)}
                  </Heading>
                  <Text color="gray.600" fontSize="sm" mt={1}>
                    Average match to the {resultsPersonaName ?? "selected"}{" "}
                    persona
                  </Text>
                </Box>

                <Box bg="white" borderWidth="1px" p={5} rounded="xl">
                  <Text color="gray.500" fontSize="sm" fontWeight="semibold">
                    Strong persona matches
                  </Text>
                  <Heading fontSize="3xl" mt={2}>
                    {audienceSummary.highAffinityPercentage}%
                  </Heading>
                  <Text color="gray.600" fontSize="sm" mt={1}>
                    {audienceSummary.highAffinityCount} potential customers
                    scoring 60+
                  </Text>
                </Box>

                <Box bg="white" borderWidth="1px" p={5} rounded="xl">
                  <Text color="gray.500" fontSize="sm" fontWeight="semibold">
                    Priority prospects
                  </Text>
                  <Heading fontSize="3xl" mt={2}>
                    {audienceSummary.primeProspectPercentage}%
                  </Heading>
                  <Text color="gray.600" fontSize="sm" mt={1}>
                    {audienceSummary.primeProspectCount} high-priority customers
                    scoring 80+
                  </Text>
                </Box>

                <Box bg="white" borderWidth="1px" p={5} rounded="xl">
                  <Text color="gray.500" fontSize="sm" fontWeight="semibold">
                    Strongest persona location
                  </Text>
                  <Heading
                    fontSize="xl"
                    mt={2}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    {audienceSummary.strongestLocation}
                  </Heading>
                  <Text color="gray.600" fontSize="sm" mt={1}>
                    {audienceSummary.strongestScore === null
                      ? "No score available"
                      : `Affinity score ${Math.round(
                          audienceSummary.strongestScore,
                        )}`}
                  </Text>
                </Box>
              </SimpleGrid>
              <Box
                borderWidth="1px"
                minH={{ base: "320px", lg: "unset" }}
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
                    {SEGMENT_RANK_ORDER.map((rank) => (
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
            </SimpleGrid>

            <TableContainer
              bg="white"
              borderWidth="1px"
              maxW="100%"
              rounded="xl"
            >
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    {resultColumns.map((column) => (
                      <Th key={column} py={3} whiteSpace="nowrap">
                        {column.replaceAll("_", " ")}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {pagedRows.length === 0 && (
                    <Tr>
                      <Td
                        colSpan={resultColumns.length}
                        py={10}
                        textAlign="center"
                      >
                        <Text color="gray.600">
                          No results match the selected segment rank.
                        </Text>
                      </Td>
                    </Tr>
                  )}
                  {pagedRows.map((row, rowIndex) => {
                    const absoluteIndex = pageStart + rowIndex;

                    return (
                      <Tr
                        cursor="pointer"
                        key={absoluteIndex}
                        onClick={() => openResultDetails(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openResultDetails(row);
                          }
                        }}
                        sx={{
                          "&:hover .row-details-action": {
                            opacity: 1,
                          },
                        }}
                        tabIndex={0}
                        _hover={{ bg: "gray.50" }}
                        _focusVisible={{
                          outline: "2px solid",
                          outlineColor: "brand.500",
                        }}
                      >
                        {resultColumns.map((column) => {
                          const value = row[column];
                          const rawScore = row.segment_affinity_score;
                          const score =
                            rawScore == null ? Number.NaN : Number(rawScore);
                          const hasScore = Number.isFinite(score);
                          const affinityColor = hasScore
                            ? getAffinityColor(score)
                            : "gray";
                          const displayValue =
                            value === null ||
                            value === undefined ||
                            value === ""
                              ? "—"
                              : typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value);

                          return (
                            <Td key={column} maxW="280px" py={3}>
                              {column === "segment_affinity_rank" ? (
                                <HStack minW="180px" spacing={2}>
                                  <Badge
                                    colorScheme={affinityColor}
                                    px={2.5}
                                    py={1}
                                    rounded="full"
                                    textTransform="capitalize"
                                    whiteSpace="nowrap"
                                  >
                                    {displayValue}
                                  </Badge>
                                  <Button
                                    className="row-details-action"
                                    colorScheme="brand"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openResultDetails(row);
                                    }}
                                    opacity={{ base: 1, md: 0 }}
                                    size="xs"
                                    transition="opacity 0.15s ease"
                                    whiteSpace="nowrap"
                                    _focusVisible={{
                                      opacity: 1,
                                      boxShadow: "outline",
                                    }}
                                  >
                                    View details
                                  </Button>
                                </HStack>
                              ) : column === "segment_affinity_score" &&
                                hasScore ? (
                                <HStack minW="150px" spacing={3}>
                                  <Progress
                                    colorScheme={affinityColor}
                                    flex="1"
                                    max={100}
                                    minW="90px"
                                    rounded="full"
                                    size="sm"
                                    value={Math.max(0, Math.min(100, score))}
                                  />
                                  <Text
                                    fontWeight="semibold"
                                    minW="28px"
                                    textAlign="right"
                                  >
                                    {displayValue}
                                  </Text>
                                </HStack>
                              ) : (
                                <Text
                                  overflow="hidden"
                                  textOverflow="ellipsis"
                                  whiteSpace="nowrap"
                                >
                                  {displayValue}
                                </Text>
                              )}
                            </Td>
                          );
                        })}
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </TableContainer>

            {filteredRows.length > 0 && (
              <Flex
                align="center"
                justify="space-between"
                mt={4}
                direction={{ base: "column", sm: "row" }}
                gap={3}
              >
                <Text color="gray.600" fontSize="sm">
                  Showing {pageStart + 1}–
                  {Math.min(pageStart + RESULTS_PER_PAGE, filteredRows.length)}{" "}
                  of {filteredRows.length}
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
                  <Text fontSize="sm" minW="100px" textAlign="center">
                    Page {currentPage} of {totalPages}
                  </Text>
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
        )}
      </Container>

      <Box
        as="section"
        bg="white"
        borderTopWidth="1px"
        py={{ base: 14, md: 20 }}
      >
        <Container maxW="4xl">
          <Box mb={{ base: 8, md: 10 }} textAlign="center">
            <Text
              color="brand.600"
              fontSize="sm"
              fontWeight="bold"
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              FAQ
            </Text>
            <Heading
              fontSize={{ base: "3xl", md: "4xl" }}
              letterSpacing="-0.025em"
              mt={2}
            >
              Frequently asked questions
            </Heading>
            <Text color="gray.600" fontSize="lg" mt={3}>
              Everything you need to know before segmenting your audience.
            </Text>
          </Box>

          <Accordion allowToggle>
            {frequentlyAskedQuestions.map(({ question, answer }) => (
              <AccordionItem
                borderColor="gray.200"
                borderWidth="1px"
                key={question}
                mb={3}
                rounded="xl"
                overflow="hidden"
              >
                <Heading as="h3">
                  <AccordionButton
                    px={{ base: 5, md: 6 }}
                    py={5}
                    _expanded={{ bg: "brand.50", color: "brand.800" }}
                    _hover={{ bg: "gray.50" }}
                  >
                    <Box
                      as="span"
                      flex="1"
                      fontSize={{ base: "md", md: "lg" }}
                      fontWeight="semibold"
                      textAlign="left"
                    >
                      {question}
                    </Box>
                    <AccordionIcon boxSize={5} ml={4} />
                  </AccordionButton>
                </Heading>
                <AccordionPanel
                  color="gray.600"
                  lineHeight="tall"
                  px={{ base: 5, md: 6 }}
                  pb={6}
                  pt={4}
                >
                  {answer}
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </Box>

      <Box as="footer" bg="white" borderTopWidth="1px">
        <Container maxW="7xl" py={5}>
          <Stack color="gray.500" fontSize="xs" spacing={1} textAlign="center">
            <Text fontSize="sm">© {currentYear} Segmentbase</Text>
            <Text>
              Contains OS data © Crown copyright and database right{" "}
              {currentYear}
            </Text>
            <Text>
              Contains Royal Mail data © Royal Mail copyright and database right{" "}
              {currentYear}
            </Text>
            <Text>
              Source: Office for National Statistics licensed under the Open
              Government Licence v.3.0
            </Text>
          </Stack>
        </Container>
      </Box>

      <Modal
        isCentered
        isOpen={detailModal.isOpen}
        onClose={() => {
          detailModal.onClose();
          setSelectedResultRow(null);
        }}
        size="3xl"
      >
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader pb={2}>What drives this audience affinity?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box bg="gray.900" color="white" mb={5} p={5} rounded="xl">
              <Flex
                align={{ base: "start", sm: "center" }}
                direction={{ base: "column", sm: "row" }}
                gap={5}
                justify="space-between"
              >
                <Box>
                  <Text color="whiteAlpha.700" fontSize="sm">
                    Overall segment affinity
                  </Text>
                  <HStack mt={2} spacing={3}>
                    <Heading fontSize="3xl">
                      {selectedHasScore
                        ? `${selectedScore}/100`
                        : "Not available"}
                    </Heading>
                    <Badge
                      colorScheme={selectedAffinityColor}
                      px={2.5}
                      py={1}
                      rounded="full"
                      textTransform="capitalize"
                    >
                      {selectedResultRow?.segment_affinity_rank == null
                        ? "No rank"
                        : String(selectedResultRow.segment_affinity_rank)}
                    </Badge>
                  </HStack>
                </Box>
                {selectedHasScore && (
                  <Progress
                    bg="whiteAlpha.300"
                    colorScheme={selectedAffinityColor}
                    max={100}
                    minW={{ base: "100%", sm: "220px" }}
                    rounded="full"
                    size="sm"
                    value={Math.max(0, Math.min(100, selectedScore))}
                  />
                )}
              </Flex>
              <Text color="whiteAlpha.800" fontSize="sm" mt={4} maxW="2xl">
                The overall score is the average of the available census-signal
                percentiles below. A higher score means{" "}
                <Text as="span" color="white" fontWeight="semibold">
                  {selectedResultRow?.geography == null
                    ? "this area"
                    : String(selectedResultRow.geography)}
                </Text>{" "}
                has a stronger concentration of traits associated with the
                selected persona compared with other areas in the dataset.
              </Text>
            </Box>

            <Text color="gray.600" fontSize="sm" mb={4}>
              Each available signal contributes equally. The census count is
              converted into a percentile from 0 to 100, while the rank
              describes how that percentile compares with the rest of the
              dataset.
            </Text>

            {selectedCensusDetails.length > 0 ? (
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                {selectedCensusDetails.map((detail, detailIndex) => (
                  <Box
                    bg="gray.50"
                    borderWidth="1px"
                    key={`${detail.label}-${detailIndex}`}
                    p={5}
                    rounded="lg"
                  >
                    <Text
                      color="gray.500"
                      fontSize="xs"
                      fontWeight="semibold"
                      letterSpacing="0.04em"
                      textTransform="uppercase"
                    >
                      {detail.category == null
                        ? "Census signal"
                        : String(detail.category)}
                    </Text>
                    <Text color="brand.700" fontWeight="bold">
                      {detail.label}
                    </Text>
                    <SimpleGrid columns={3} mt={4} spacing={3}>
                      <Box>
                        <Text
                          color="gray.500"
                          fontSize="xs"
                          textTransform="uppercase"
                        >
                          Census count
                        </Text>
                        <Text fontWeight="semibold" mt={1}>
                          {detail.value == null ? "—" : String(detail.value)}
                        </Text>
                      </Box>
                      <Box>
                        <Text
                          color="gray.500"
                          fontSize="xs"
                          textTransform="uppercase"
                        >
                          Percentile
                        </Text>
                        <Text fontWeight="semibold" mt={1}>
                          {detail.affinity == null
                            ? "—"
                            : String(detail.affinity)}
                        </Text>
                      </Box>
                      <Box>
                        <Text
                          color="gray.500"
                          fontSize="xs"
                          textTransform="uppercase"
                        >
                          Relative rank
                        </Text>
                        <Text fontWeight="semibold" mt={1}>
                          {detail.rank == null ? "—" : String(detail.rank)}
                        </Text>
                      </Box>
                    </SimpleGrid>
                    <Text color="gray.600" fontSize="xs" mt={4}>
                      This signal’s percentile contributes{" "}
                      {detail.affinity == null
                        ? "no points"
                        : `${String(detail.affinity)} points`}{" "}
                      to the average used for the overall affinity score.
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            ) : (
              <Text color="gray.600">
                No census details are available for this row.
              </Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => {
                detailModal.onClose();
                setSelectedResultRow(null);
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        closeOnOverlayClick={!isUploading}
        isCentered
        isOpen={personaModal.isOpen}
        onClose={handleModalClose}
        size="3xl"
      >
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader pb={2}>Choose an audience persona</ModalHeader>
          <ModalCloseButton isDisabled={isUploading} />
          <ModalBody>
            <Text color="gray.600" mb={5}>
              Select the audience you want to identify in{" "}
              <Text as="span" fontWeight="semibold">
                {pendingFile?.name}
              </Text>
              . We’ll enrich the file with the most relevant census signals.
            </Text>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              {personas.map((persona) => {
                const isSelected = selectedPersonaId === persona.id;

                return (
                  <Box
                    aria-pressed={isSelected}
                    as="button"
                    bg={isSelected ? "brand.50" : "white"}
                    borderColor={isSelected ? "brand.500" : "gray.200"}
                    borderWidth="2px"
                    key={persona.id}
                    onClick={() => setSelectedPersonaId(persona.id)}
                    p={4}
                    rounded="lg"
                    textAlign="left"
                    transition="all 0.15s ease"
                    _focusVisible={{ boxShadow: "outline" }}
                    _hover={{
                      borderColor: "brand.400",
                      transform: "translateY(-1px)",
                    }}
                  >
                    <Text
                      color={isSelected ? "brand.700" : "gray.800"}
                      fontWeight="bold"
                    >
                      {persona.name}
                    </Text>
                    <Text color="gray.600" fontSize="sm" mt={1}>
                      {persona.description}
                    </Text>
                  </Box>
                );
              })}
            </SimpleGrid>

            {uploadResult?.status === "error" && (
              <Alert mt={4} rounded="md" status="error">
                <AlertIcon />
                <AlertDescription>{uploadResult.message}</AlertDescription>
              </Alert>
            )}
          </ModalBody>

          <ModalFooter gap={3}>
            <Button
              isDisabled={isUploading}
              onClick={handleModalClose}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              colorScheme="brand"
              isDisabled={!selectedPersonaId}
              isLoading={isUploading}
              loadingText="Processing CSV"
              onClick={handleUpload}
              rightIcon={<ArrowForwardIcon />}
            >
              Upload with persona
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
