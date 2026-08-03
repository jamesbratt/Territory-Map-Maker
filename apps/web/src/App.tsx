import {
  ArrowForwardIcon,
  AtSignIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  EmailIcon,
  Search2Icon,
} from "@chakra-ui/icons";
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
  IconButton,
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
  Spinner,
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
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AreaResultsTable } from "./components/AreaResultsTable";
import { ResultsMap, SEGMENT_RANKS } from "./components/ResultsMap";
import {
  ResultsViewSwitcher,
  type ResultsView,
} from "./components/ResultsViewSwitcher";
import { uploadCsv } from "./lib/api";

const RESULTS_PER_PAGE = 10;
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`);

const MAPTILER_API_KEY = "rvEdtOdLKbADHjJHzejJ";
const MAP_STYLE_URL = `https://api.maptiler.com/maps/base-v4/style.json?key=${MAPTILER_API_KEY}`;

type AnalyticsWindow = Window & {
  gtag?: (
    command: "event",
    eventName: string,
    parameters?: Record<string, string | number>,
  ) => void;
};

function trackAnalyticsEvent(
  eventName: string,
  parameters?: Record<string, string | number>,
) {
  (window as AnalyticsWindow).gtag?.("event", eventName, parameters);
}

function getAffinityColor(score: number): string {
  if (score >= 80) return "green";
  if (score >= 60) return "teal";
  if (score >= 40) return "blue";
  if (score >= 20) return "orange";
  return "red";
}

function formatCensusSignal(signal: string): string {
  const ageRange = signal.match(/^age_(\d+)_(\d+)$/);
  if (ageRange) return `Age ${ageRange[1]}–${ageRange[2]}`;

  const ageAndOver = signal.match(/^age_(\d+)_plus$/);
  if (ageAndOver) return `Age ${ageAndOver[1]}+`;

  const label = signal.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
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

const gbpFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function formatCensusDetailValue(value: unknown, category: unknown): string {
  if (value === null || value === undefined) return "—";

  if (category === "Household Income") {
    const incomeInThousands = Number(value);
    if (Number.isFinite(incomeInThousands)) {
      return gbpFormatter.format(incomeInThousands * 1_000);
    }
  }

  return String(value);
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
      "annual_income_before_costs_high",
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
      "annual_income_after_costs_high",
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
      "annual_income_after_costs_low",
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
      "annual_income_after_costs_high",
    ],
  },
  {
    id: "small-business-owners",
    name: "Small business owners",
    description:
      "Entrepreneurial adults running businesses or working on their own account.",
    variables: [
      "age_35_44",
      "small_employers_own_account",
      "active_excl_students_self_emp_with_employees",
      "owned_mortgage_or_loan",
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

const useCases = [
  {
    title: "Plan campaigns with confidence",
    description:
      "Stop wasting budget targeting audiences based on guesswork. Rank your customer data by demographic fit before launch, so you know who to prioritise, where to focus spend and which segments to leave out.",
    icon: CalendarIcon,
    accent: "brand.500",
    background: "brand.50",
  },
  {
    title: "Make direct mail spend count",
    description:
      "Stop paying to print and post to low-fit households. Prioritise addresses with the strongest demographic match, build more focused mailing lists and put your budget behind the people most likely to respond.",
    icon: EmailIcon,
    accent: "purple.500",
    background: "purple.50",
  },
  {
    title: "Prioritise the right leads",
    description:
      "Stop treating every lead as equally valuable. Add demographic-fit scores to your existing lead data, so sales teams can focus their time on the prospects most likely to match your ideal customer profile.",
    icon: Search2Icon,
    accent: "blue.500",
    background: "blue.50",
  },
  {
    title: "Send more relevant emails",
    description:
      "Stop sending the same message to everyone and hoping it lands. Segment your contact list by demographic fit to target campaigns more precisely, tailor your messaging and give every email a better chance of converting.",
    icon: AtSignIcon,
    accent: "orange.500",
    background: "orange.50",
  },
] as const;

const answerableQuestions = [
  "Which customers are the strongest match for my chosen persona?",
  "Which UK areas have the highest concentration of high-affinity customers?",
  "Where is my largest high-affinity audience located?",
  "How many customers rank in the top 10%, 20% or 30%?",
  "How does audience affinity compare from one area to another?",
  "Which records should I prioritise for my next campaign?",
] as const;

const heroSlides = [
  {
    src: "/images/segmentbase-audience.png",
    alt: "Segmentbase audience results showing affinity scores and a map",
    label: "Explore individual audience matches",
  },
  {
    src: "/images/segmentbase-audience-affinity.png",
    alt: "Segmentbase audience table showing affinity ranks and scores",
    label: "Rank and prioritise every audience record",
  },
  {
    src: "/images/segmentbase-areas.png",
    alt: "Segmentbase area results comparing affinity ranks by location",
    label: "Compare audience affinity by area",
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
  const shouldScrollToResultsRef = useRef(false);
  const postcodeModal = useDisclosure();
  const personaModal = useDisclosure();
  const detailModal = useDisclosure();
  const processingSuccessModal = useDisclosure();
  const [postcodeColumn, setPostcodeColumn] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPostcodeColumn, setUploadedPostcodeColumn] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(
    null,
  );
  const [resultsPersonaId, setResultsPersonaId] = useState<string | null>(null);
  const [resultsPersonaName, setResultsPersonaName] = useState<string | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isChangingPersona, setIsChangingPersona] = useState(false);
  const [uploadRows, setUploadRows] = useState<Record<string, unknown>[]>([]);
  const [resultsView, setResultsView] = useState<ResultsView>("results");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<
    "none" | "ascending" | "descending"
  >("descending");
  const [rankFilter, setRankFilter] = useState("all");
  const [heroSlide, setHeroSlide] = useState(0);
  const [selectedResultRow, setSelectedResultRow] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    status: "error";
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
    fields.delete("lat");
    fields.delete("long");
    fields.delete("lad25cd");
    fields.delete("lad25nm");

    return [
      "segment",
      "segment_affinity_rank",
      "segment_affinity_score",
      "lad25nm",
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
        const firstIndex = SEGMENT_RANKS.findIndex(
          (rank) => rank === first.toLowerCase(),
        );
        const secondIndex = SEGMENT_RANKS.findIndex(
          (rank) => rank === second.toLowerCase(),
        );

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
  const resultsPersona = personas.find(
    (persona) => persona.id === resultsPersonaId,
  );
  const resultsPersonaSignals = useMemo(() => {
    const censusValues = uploadRows[0]?.censusValues;

    return (resultsPersona?.variables ?? []).map((signal) => {
      const signalData = Array.isArray(censusValues)
        ? censusValues.find(
            (entry): entry is Record<string, unknown> =>
              typeof entry === "object" &&
              entry !== null &&
              Object.prototype.hasOwnProperty.call(entry, signal),
          )
        : undefined;

      return {
        key: signal,
        label: String(
          signalData?.[`${signal}_friendly_label`] ??
            formatCensusSignal(signal),
        ),
        category: String(
          signalData?.[`${signal}_category_name`] ?? "Census signal",
        ),
      };
    });
  }, [resultsPersona, uploadRows]);
  const highRankingSummary = useMemo(() => {
    const highRanks = new Set(["top 10%", "top 20%", "top 30%"]);
    const count = uploadRows.filter((row) =>
      highRanks.has(String(row.segment_affinity_rank).toLowerCase()),
    ).length;

    return {
      count,
      percentage:
        uploadRows.length === 0
          ? 0
          : Math.round((count / uploadRows.length) * 100),
    };
  }, [uploadRows]);

  useEffect(() => {
    if (!shouldScrollToResultsRef.current || uploadRows.length === 0) return;

    shouldScrollToResultsRef.current = false;
    resultsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [uploadRows]);

  const openResultDetails = (row: Record<string, unknown>) => {
    setSelectedResultRow(row);
    detailModal.onOpen();
  };

  const exportVisibleRows = () => {
    if (sortedRows.length === 0) return;

    trackAnalyticsEvent("csv_export_click", {
      exported_row_count: sortedRows.length,
      persona: resultsPersonaName ?? "unknown",
    });

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
    setPostcodeColumn("");
    setSelectedPersonaId(null);
    setUploadResult(null);
    postcodeModal.onOpen();
  };

  const handlePostcodeModalClose = () => {
    setPendingFile(null);
    setPostcodeColumn("");
    postcodeModal.onClose();
  };

  const handlePostcodeContinue = () => {
    if (!postcodeColumn.trim()) return;

    postcodeModal.onClose();
    personaModal.onOpen();
  };

  const handleModalClose = () => {
    if (isUploading) return;
    setPendingFile(null);
    setPostcodeColumn("");
    setSelectedPersonaId(null);
    personaModal.onClose();
  };

  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleUpload = async () => {
    const persona = personas.find(({ id }) => id === selectedPersonaId);
    if (!pendingFile || !persona) return;

    trackAnalyticsEvent("csv_upload_click", {
      persona: persona.name,
    });

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
      shouldScrollToResultsRef.current = true;
      setUploadedFile(pendingFile);
      setUploadedPostcodeColumn(postcodeColumn.trim());
      setResultsPersonaId(persona.id);
      setResultsPersonaName(persona.name);
      setUploadRows(rowsWithSegment);
      setCurrentPage(1);
      setRankFilter("all");
      setSelectedResultRow(null);
      setPendingFile(null);
      setSelectedPersonaId(null);
      personaModal.onClose();
      processingSuccessModal.onOpen();
    } catch (error) {
      setUploadResult({
        status: "error",
        message: error instanceof Error ? error.message : "The upload failed.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleResultsPersonaChange = async (personaId: string) => {
    const persona = personas.find(({ id }) => id === personaId);
    if (!uploadedFile || !persona || persona.id === resultsPersonaId) return;

    const previousPersonaId = resultsPersonaId;
    setResultsPersonaId(persona.id);
    setIsUploading(true);
    setIsChangingPersona(true);
    setUploadResult(null);

    try {
      const rows = await uploadCsv(uploadedFile, uploadedPostcodeColumn, [
        ...persona.variables,
      ]);
      const rowsWithSegment = rows.map((row) => ({
        segment: persona.name,
        ...row,
      }));

      setResultsPersonaId(persona.id);
      setResultsPersonaName(persona.name);
      setUploadRows(rowsWithSegment);
      setCurrentPage(1);
      setRankFilter("all");
      setSelectedResultRow(null);
      processingSuccessModal.onOpen();
    } catch (error) {
      setResultsPersonaId(previousPersonaId);
      setUploadResult({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The file could not be reprocessed.",
      });
    } finally {
      setIsUploading(false);
      setIsChangingPersona(false);
    }
  };

  return (
    <Box display="flex" flexDirection="column" minH="100vh">
      <Box as="header" bg="white" borderBottomWidth="1px">
        <Container maxW="7xl" py={4}>
          <Heading fontSize="lg" letterSpacing="-0.02em">
            Segmentbase
          </Heading>
        </Container>
      </Box>

      <Container flex="1" maxW="7xl" py={{ base: 10, md: 16 }}>
        <SimpleGrid
          alignItems="center"
          spacing={{ base: 10, lg: 12 }}
          templateColumns={{ base: "1fr", lg: "1.15fr 0.85fr" }}
        >
          <Stack align="flex-start" spacing={6} textAlign="left">
            <Heading
              fontSize={{ base: "4xl", md: "5xl", xl: "6xl" }}
              letterSpacing="-0.025em"
              lineHeight="1.08"
            >
              Turn customer postcodes into demographic audience insights
            </Heading>
            <Text color="gray.600" fontSize={{ base: "lg", md: "xl" }}>
              Segment your United Kingdom audience data into personas based on
              age group, household type, occupation, household income and more,
              so you can focus your marketing on audiences most likely to
              convert.
            </Text>

            <Button
              as="a"
              colorScheme="brand"
              href="#upload"
              onClick={(event) => {
                event.preventDefault();
                trackAnalyticsEvent("try_now_click", {
                  button_location: "hero",
                });
                scrollToUpload();
              }}
              rightIcon={<ArrowForwardIcon />}
              size="lg"
            >
              Try for free
            </Button>
          </Stack>

          <Box
            bg="gray.100"
            borderColor="gray.200"
            borderWidth="1px"
            overflow="hidden"
            position="relative"
            rounded="2xl"
            shadow="xl"
          >
            <Image
              alt={heroSlides[heroSlide].alt}
              aspectRatio={16 / 10}
              objectFit="cover"
              objectPosition="left top"
              src={heroSlides[heroSlide].src}
              w="full"
            />
            <Box
              bgGradient="linear(to-t, blackAlpha.700, transparent)"
              bottom={0}
              h="35%"
              left={0}
              pointerEvents="none"
              position="absolute"
              right={0}
            />
            <Text
              bottom={5}
              color="white"
              fontSize="sm"
              fontWeight="semibold"
              left={5}
              position="absolute"
              textShadow="0 1px 8px rgba(0, 0, 0, 0.45)"
            >
              {heroSlides[heroSlide].label}
            </Text>
            <HStack position="absolute" right={4} top={4}>
              <IconButton
                aria-label="Show previous screenshot"
                bg="whiteAlpha.900"
                icon={<ChevronLeftIcon />}
                onClick={() =>
                  setHeroSlide(
                    (slide) =>
                      (slide + heroSlides.length - 1) % heroSlides.length,
                  )
                }
                rounded="full"
                size="sm"
                _hover={{ bg: "white" }}
              />
              <IconButton
                aria-label="Show next screenshot"
                bg="whiteAlpha.900"
                icon={<ChevronRightIcon />}
                onClick={() =>
                  setHeroSlide((slide) => (slide + 1) % heroSlides.length)
                }
                rounded="full"
                size="sm"
                _hover={{ bg: "white" }}
              />
            </HStack>
            <HStack bottom={5} position="absolute" right={5} spacing={2}>
              {heroSlides.map((slide, index) => (
                <Box
                  aria-label={`Show ${slide.label}`}
                  as="button"
                  bg={index === heroSlide ? "white" : "whiteAlpha.500"}
                  borderRadius="full"
                  h="8px"
                  key={slide.src}
                  onClick={() => setHeroSlide(index)}
                  transition="width 0.2s ease"
                  w={index === heroSlide ? "22px" : "8px"}
                />
              ))}
            </HStack>
          </Box>
        </SimpleGrid>

        <Box as="section" mt={{ base: 20, md: 28 }}>
          <Text
            color="brand.600"
            fontSize="sm"
            fontWeight="semibold"
            letterSpacing="0.08em"
            textAlign="center"
            textTransform="uppercase"
          >
            Use cases
          </Text>
          <Heading
            fontSize={{ base: "3xl", md: "4xl" }}
            letterSpacing="-0.035em"
            mt={2}
            textAlign="center"
          >
            How can Segmentbase help you?
          </Heading>
          <Text
            color="gray.600"
            fontSize="lg"
            maxW="2xl"
            mb={{ base: 8, md: 10 }}
            mt={3}
            mx="auto"
            textAlign="center"
          >
            Reduce wasted spend, focus your budget on the right audiences and
            increase ROI across every campaign.
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
            {useCases.map((useCase) => (
              <Box
                bg="white"
                borderColor="gray.200"
                borderWidth="1px"
                display="flex"
                flexDirection="column"
                key={useCase.title}
                p={{ base: 6, md: 8 }}
                position="relative"
                rounded="2xl"
                shadow="sm"
                transition="transform 0.2s ease, box-shadow 0.2s ease"
                _hover={{
                  shadow: "lg",
                  transform: "translateY(-4px)",
                }}
              >
                <HStack align="center" spacing={4}>
                  <Flex
                    align="center"
                    bg={useCase.background}
                    color={useCase.accent}
                    flexShrink={0}
                    h={12}
                    justify="center"
                    rounded="xl"
                    w={12}
                  >
                    <Icon as={useCase.icon} boxSize={5} />
                  </Flex>
                  <Heading fontSize="2xl" letterSpacing="-0.025em">
                    {useCase.title}
                  </Heading>
                </HStack>
                <Text color="gray.600" lineHeight="tall" mt={3}>
                  {useCase.description}
                </Text>
                <Flex justify="flex-end" mt="auto" pt={6}>
                  <Button
                    as="a"
                    colorScheme="brand"
                    href="#upload"
                    onClick={(event) => {
                      event.preventDefault();
                      trackAnalyticsEvent("use_case_cta_click", {
                        use_case: useCase.title,
                        cta_label: "Try now",
                      });
                      scrollToUpload();
                    }}
                    rightIcon={<ArrowForwardIcon />}
                    size="sm"
                    variant="ghost"
                  >
                    Try now
                  </Button>
                </Flex>
              </Box>
            ))}
          </SimpleGrid>
        </Box>

        <Box
          as="section"
          bg="brand.800"
          color="white"
          mt={{ base: 16, md: 20 }}
          overflow="hidden"
          p={{ base: 6, md: 10 }}
          position="relative"
          rounded="2xl"
        >
          <Box
            bg="brand.700"
            borderRadius="full"
            h="280px"
            opacity={0.45}
            position="absolute"
            right="-100px"
            top="-150px"
            w="280px"
          />
          <SimpleGrid
            columns={{ base: 1, lg: 2 }}
            position="relative"
            spacing={{ base: 8, lg: 12 }}
          >
            <Box>
              <Text
                color="brand.200"
                fontSize="sm"
                fontWeight="semibold"
                letterSpacing="0.08em"
                textTransform="uppercase"
              >
                Questions answered
              </Text>
              <Heading
                fontSize={{ base: "3xl", md: "4xl" }}
                letterSpacing="-0.035em"
                mt={2}
              >
                Turn audience data into clearer decisions
              </Heading>
              <Text
                color="whiteAlpha.800"
                fontSize="lg"
                lineHeight="tall"
                mt={4}
              >
                Segmentbase helps you move beyond postcodes to answer practical
                questions about who to target and where to find them.
              </Text>
            </Box>

            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              {answerableQuestions.map((question) => (
                <HStack
                  align="start"
                  bg="whiteAlpha.100"
                  borderColor="whiteAlpha.200"
                  borderWidth="1px"
                  key={question}
                  p={4}
                  rounded="xl"
                  spacing={3}
                >
                  <CheckCircleIcon color="brand.200" flexShrink={0} mt={1} />
                  <Text fontSize="sm" fontWeight="medium" lineHeight="tall">
                    {question}
                  </Text>
                </HStack>
              ))}
            </SimpleGrid>
          </SimpleGrid>
        </Box>

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
              From a postcode to audience insight
            </Heading>
            <Text color="gray.600" fontSize="lg" maxW="2xl" mt={3} mx="auto">
              Turn a simple spreadsheet of customer postcodes into clear,
              actionable audience intelligence in three straightforward steps.
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
              <Input
                accept=".csv,text/csv"
                display="none"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />
              <Button
                colorScheme="brand"
                onClick={() => fileInputRef.current?.click()}
                rightIcon={<ArrowForwardIcon />}
                size="lg"
              >
                Choose CSV file
              </Button>
              <Text color="gray.500" fontSize="sm" textAlign="center">
                After choosing a file, you’ll identify its postcode column and
                select an audience persona.
              </Text>
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
              align={{ base: "stretch", sm: "end" }}
              direction={{ base: "column", sm: "row" }}
              gap={4}
              justify="space-between"
              mb={6}
              order={-3}
            >
              <ResultsViewSwitcher
                onChange={setResultsView}
                value={resultsView}
              />
              <HStack align="flex-end" spacing={2}>
                <FormControl maxW={{ sm: "240px" }} minW={{ sm: "190px" }}>
                  <FormLabel fontSize="sm" mb={1}>
                    Persona
                  </FormLabel>
                  <Select
                    bg="white"
                    isDisabled={isUploading || !uploadedFile}
                    onChange={(event) => {
                      void handleResultsPersonaChange(event.target.value);
                    }}
                    value={resultsPersonaId ?? ""}
                  >
                    {personas.map((persona) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <Flex align="center" h="40px" justify="center" w={5}>
                  {isChangingPersona && (
                    <Spinner
                      color="brand.500"
                      label="Loading persona results"
                      size="sm"
                    />
                  )}
                </Flex>
              </HStack>
            </Flex>
            {resultsView === "results" ? (
              <>
                <Flex
                  align={{ base: "stretch", lg: "end" }}
                  direction={{ base: "column", lg: "row" }}
                  gap={3}
                  justify="space-between"
                  mb={4}
                  order={-1}
                >
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
                  </Stack>
                  <Button
                    alignSelf="flex-end"
                    colorScheme="brand"
                    flexShrink={0}
                    isDisabled={sortedRows.length === 0}
                    leftIcon={<DownloadIcon />}
                    ml={{ lg: "auto" }}
                    onClick={exportVisibleRows}
                    whiteSpace="nowrap"
                  >
                    Export CSV
                  </Button>
                </Flex>

                {uploadResult?.status === "error" && (
                  <Alert mb={4} rounded="md" status="error">
                    <AlertIcon />
                    <AlertDescription>{uploadResult.message}</AlertDescription>
                  </Alert>
                )}

                <SimpleGrid
                  columns={{ base: 1, lg: 2 }}
                  mb={8}
                  order={-2}
                  spacing={{ base: 4, lg: 8 }}
                >
                  <Box
                    bg="white"
                    borderWidth="1px"
                    minH="320px"
                    overflow="hidden"
                    rounded="xl"
                  >
                    <Flex
                      align={{ base: "stretch", sm: "center" }}
                      borderBottomWidth="1px"
                      direction={{ base: "column", sm: "row" }}
                      gap={5}
                      justify="space-between"
                      p={{ base: 5, md: 6 }}
                    >
                      <Box>
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
                          {resultsPersonaName ?? "Selected audience"}
                        </Heading>
                        <Text color="gray.600" fontSize="sm" mt={2}>
                          This audience is composed of the following census
                          signals.
                        </Text>
                      </Box>

                      <Box
                        bg="brand.50"
                        flexShrink={0}
                        minW={{ sm: "150px" }}
                        p={4}
                        rounded="xl"
                        textAlign={{ base: "left", sm: "center" }}
                      >
                        <Heading color="brand.700" fontSize="3xl">
                          {highRankingSummary.percentage}%
                        </Heading>
                        <Text
                          color="brand.800"
                          fontSize="xs"
                          fontWeight="semibold"
                        >
                          {highRankingSummary.count} rows rank in the top 30%
                        </Text>
                      </Box>
                    </Flex>

                    <Wrap p={{ base: 4, md: 5 }} spacing={2}>
                      {resultsPersonaSignals.map((signal) => (
                        <WrapItem key={signal.key}>
                          <HStack
                            bg="gray.50"
                            borderWidth="1px"
                            px={3}
                            py={1.5}
                            rounded="full"
                            spacing={2}
                          >
                            <Box
                              bg="brand.500"
                              borderRadius="full"
                              boxSize="7px"
                              flexShrink={0}
                            />
                            <Text fontSize="sm" fontWeight="medium">
                              {signal.label}
                              <Text
                                as="span"
                                color="gray.500"
                                fontSize="xs"
                                fontWeight="normal"
                              >
                                {" · "}
                                {signal.category}
                              </Text>
                            </Text>
                          </HStack>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                  <ResultsMap
                    mapStyleUrl={MAP_STYLE_URL}
                    results={filteredRows}
                  />
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
                            {column === "lad25nm"
                              ? "Area"
                              : column.replaceAll("_", " ")}
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
                                rawScore == null
                                  ? Number.NaN
                                  : Number(rawScore);
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
                                        value={Math.max(
                                          0,
                                          Math.min(100, score),
                                        )}
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
                      {Math.min(
                        pageStart + RESULTS_PER_PAGE,
                        filteredRows.length,
                      )}{" "}
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
                      <HStack spacing={2}>
                        <Text fontSize="sm">Page</Text>
                        <Select
                          aria-label="Select results page"
                          onChange={(event) =>
                            setCurrentPage(Number(event.target.value))
                          }
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
              </>
            ) : (
              <AreaResultsTable
                mapStyleUrl={MAP_STYLE_URL}
                personaName={resultsPersonaName}
                results={uploadRows}
              />
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
        isOpen={processingSuccessModal.isOpen}
        onClose={processingSuccessModal.onClose}
        returnFocusOnClose={false}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent mx={4} overflow="hidden">
          <Box
            bgGradient="linear(to-br, brand.50, purple.50)"
            px={{ base: 6, md: 10 }}
            py={{ base: 8, md: 10 }}
            textAlign="center"
          >
            <Text
              fontSize="5xl"
              lineHeight="1"
              role="img"
              aria-label="Party and rocket"
            >
              🎉 🚀
            </Text>
            <Heading fontSize={{ base: "2xl", md: "3xl" }} mt={5}>
              Your audience is ready!
            </Heading>
            <Text color="gray.600" mt={3}>
              We found a high-fit group worth putting at the front of your next
              campaign.
            </Text>

            <Box bg="white" boxShadow="sm" mt={6} p={5} rounded="xl">
              <Heading color="brand.700" fontSize="4xl">
                {highRankingSummary.percentage}%
              </Heading>
              <Text color="gray.700" fontWeight="semibold" mt={1}>
                {highRankingSummary.count} of {uploadRows.length}{" "}
                {uploadRows.length === 1 ? "contact ranks" : "contacts rank"} in
                the top 30% for {resultsPersonaName ?? "this audience"}
              </Text>
            </Box>

            <Text color="gray.600" fontSize="sm" lineHeight="tall" mt={5}>
              Start with these contacts in your next email, direct-mail or sales
              campaign, then export the enriched CSV to put the insight to work.
            </Text>
          </Box>
          <ModalFooter justifyContent="center" py={5}>
            <Button
              colorScheme="brand"
              onClick={() => {
                processingSuccessModal.onClose();
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    resultsSectionRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  });
                });
              }}
              rightIcon={<ArrowForwardIcon />}
            >
              Explore your results
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isCentered
        isOpen={detailModal.isOpen}
        onClose={() => {
          detailModal.onClose();
          setSelectedResultRow(null);
        }}
        scrollBehavior="inside"
        size="5xl"
      >
        <ModalOverlay />
        <ModalContent mx={4}>
          <ModalHeader pb={2}>What drives this audience affinity?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Box bg="gray.900" color="white" mb={3} p={4} rounded="xl">
              <Flex
                align={{ base: "start", sm: "center" }}
                direction={{ base: "column", sm: "row" }}
                gap={3}
                justify="space-between"
              >
                <Box>
                  <Text color="whiteAlpha.700" fontSize="sm">
                    Overall segment affinity
                  </Text>
                  <HStack mt={1} spacing={3}>
                    <Heading fontSize="2xl">
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
              <Text color="whiteAlpha.800" fontSize="sm" mt={3} maxW="3xl">
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

            <Text color="gray.600" fontSize="sm" mb={3}>
              Each available signal contributes equally. The census count is
              converted into a percentile from 0 to 100, while the rank
              describes how that percentile compares with the rest of the
              dataset.
            </Text>

            {selectedCensusDetails.length > 0 ? (
              <SimpleGrid
                columns={{ base: 1, md: 2, xl: 3 }}
                spacing={3}
              >
                {selectedCensusDetails.map((detail, detailIndex) => (
                  <Box
                    bg="gray.50"
                    borderWidth="1px"
                    key={`${detail.label}-${detailIndex}`}
                    p={3}
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
                    <SimpleGrid columns={3} mt={2} spacing={2}>
                      <Box>
                        <Text
                          color="gray.500"
                          fontSize="xs"
                          textTransform="uppercase"
                        >
                          Census count
                        </Text>
                        <Text fontSize="sm" fontWeight="semibold" mt={0.5}>
                          {formatCensusDetailValue(
                            detail.value,
                            detail.category,
                          )}
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
                        <Text fontSize="sm" fontWeight="semibold" mt={0.5}>
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
                        <Text fontSize="sm" fontWeight="semibold" mt={0.5}>
                          {detail.rank == null ? "—" : String(detail.rank)}
                        </Text>
                      </Box>
                    </SimpleGrid>
                    <Text color="gray.600" fontSize="xs" mt={2}>
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
        initialFocusRef={postcodeInputRef}
        isCentered
        isOpen={postcodeModal.isOpen}
        onClose={handlePostcodeModalClose}
        size="md"
      >
        <ModalOverlay />
        <ModalContent
          as="form"
          mx={4}
          onSubmit={(event) => {
            event.preventDefault();
            handlePostcodeContinue();
          }}
        >
          <ModalHeader pb={2}>Identify the postcode column</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color="gray.600" mb={5}>
              Enter the exact column header containing postcodes in{" "}
              <Text as="span" fontWeight="semibold">
                {pendingFile?.name}
              </Text>
              .
            </Text>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Postcode column header</FormLabel>
              <Input
                onChange={(event) => setPostcodeColumn(event.target.value)}
                placeholder="For example, postcode"
                ref={postcodeInputRef}
                value={postcodeColumn}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={handlePostcodeModalClose} variant="ghost">
              Cancel
            </Button>
            <Button
              colorScheme="brand"
              isDisabled={!postcodeColumn.trim()}
              rightIcon={<ArrowForwardIcon />}
              type="submit"
            >
              Continue
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
