import { ArrowForwardIcon, AtSignIcon } from "@chakra-ui/icons";
import {
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
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
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
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { ApiStatus } from "./components/ApiStatus";
import { uploadCsv } from "./lib/api";

const RESULTS_PER_PAGE = 10;

function getAffinityColor(score: number): string {
  if (score >= 80) return "green";
  if (score >= 60) return "teal";
  if (score >= 40) return "blue";
  if (score >= 20) return "orange";
  return "red";
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
        label: String(friendlyLabelEntry?.[1] ?? valueEntry?.[0] ?? "Census value"),
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
    description: "Established, high-value households with strong spending power.",
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

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const personaModal = useDisclosure();
  const detailModal = useDisclosure();
  const [postcodeColumn, setPostcodeColumn] = useState("postcode");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadRows, setUploadRows] = useState<Record<string, unknown>[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResultRow, setSelectedResultRow] =
    useState<Record<string, unknown> | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const resultColumns = useMemo(() => {
    const fields = new Set(uploadRows.flatMap((row) => Object.keys(row)));
    fields.delete("segment_affinity_rank");
    fields.delete("segment_affinity_score");
    fields.delete("censusValues");

    return [
      "segment_affinity_rank",
      "segment_affinity_score",
      ...fields,
    ];
  }, [uploadRows]);

  const totalPages = Math.ceil(uploadRows.length / RESULTS_PER_PAGE);
  const pageStart = (currentPage - 1) * RESULTS_PER_PAGE;
  const pagedRows = useMemo(
    () => uploadRows.slice(pageStart, pageStart + RESULTS_PER_PAGE),
    [pageStart, uploadRows],
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
      const rows = await uploadCsv(
        pendingFile,
        postcodeColumn.trim(),
        [...persona.variables],
      );
      setUploadResult({
        status: "success",
        message: `${pendingFile.name} uploaded for the ${persona.name} persona. ${rows.length} rows processed.`,
      });
      setUploadRows(rows);
      setCurrentPage(1);
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
    <Box minH="100vh">
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
                Segment
              </Heading>
            </HStack>
            <ApiStatus />
          </Flex>
        </Container>
      </Box>

      <Container maxW="7xl" py={{ base: 10, md: 16 }}>
        <Stack align="center" spacing={6} textAlign="center">
          <Text
            color="brand.600"
            fontSize="sm"
            fontWeight="semibold"
            letterSpacing="0.08em"
            textTransform="uppercase"
          >
            Audience intelligence
          </Text>
          <Heading
            fontSize={{ base: "4xl", md: "6xl" }}
            letterSpacing="-0.045em"
            lineHeight="0.98"
            maxW="3xl"
          >
            Understand the people behind every postcode.
          </Heading>
          <Text color="gray.600" fontSize={{ base: "lg", md: "xl" }} maxW="2xl">
            Upload customer data, enrich it with census insights, and build
            clear, actionable audience segments.
          </Text>

          <Box
            bg="white"
            borderWidth="1px"
            maxW="2xl"
            p={{ base: 5, md: 6 }}
            rounded="xl"
            textAlign="left"
            w="full"
          >
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Postcode column</FormLabel>
                <Input
                  onChange={(event) => setPostcodeColumn(event.target.value)}
                  placeholder="postcode"
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
        </Stack>

        {uploadRows.length > 0 && (
          <Box mt={{ base: 10, md: 14 }}>
            <Flex
              align={{ base: "start", sm: "end" }}
              justify="space-between"
              mb={4}
              direction={{ base: "column", sm: "row" }}
              gap={2}
            >
              <Box>
                <Heading fontSize="2xl">Audience results</Heading>
                <Text color="gray.600" mt={1}>
                  {uploadRows.length} enriched{" "}
                  {uploadRows.length === 1 ? "record" : "records"}
                </Text>
              </Box>
            </Flex>

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
                  {pagedRows.map((row, rowIndex) => {
                    const absoluteIndex = pageStart + rowIndex;

                    return (
                      <Tr
                        cursor="pointer"
                        key={absoluteIndex}
                        onClick={() => {
                          setSelectedResultRow(row);
                          detailModal.onOpen();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedResultRow(row);
                            detailModal.onOpen();
                          }
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
                            value === null || value === undefined || value === ""
                              ? "—"
                              : typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value);

                          return (
                            <Td key={column} maxW="280px" py={3}>
                              {column === "segment_affinity_rank" ? (
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
                              ) : column === "segment_affinity_score" && hasScore ? (
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

            <Flex
              align="center"
              justify="space-between"
              mt={4}
              direction={{ base: "column", sm: "row" }}
              gap={3}
            >
              <Text color="gray.600" fontSize="sm">
                Showing {pageStart + 1}–
                {Math.min(pageStart + RESULTS_PER_PAGE, uploadRows.length)} of{" "}
                {uploadRows.length}
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
          </Box>
        )}

      </Container>

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
                      {selectedHasScore ? `${selectedScore}/100` : "Not available"}
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
                percentiles below. A higher score means this area has a stronger
                concentration of traits associated with the selected persona
                compared with other areas in the dataset.
              </Text>
            </Box>

            <Text color="gray.600" fontSize="sm" mb={4}>
              Each available signal contributes equally. The census count is
              converted into a percentile from 0 to 100, while the rank describes
              how that percentile compares with the rest of the dataset.
            </Text>

            {selectedCensusDetails.length > 0 ? (
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                {selectedCensusDetails.map(
                  (detail, detailIndex) => (
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
                          <Text color="gray.500" fontSize="xs" textTransform="uppercase">
                            Census count
                          </Text>
                          <Text fontWeight="semibold" mt={1}>
                            {detail.value == null ? "—" : String(detail.value)}
                          </Text>
                        </Box>
                        <Box>
                          <Text color="gray.500" fontSize="xs" textTransform="uppercase">
                            Percentile
                          </Text>
                          <Text fontWeight="semibold" mt={1}>
                            {detail.affinity == null ? "—" : String(detail.affinity)}
                          </Text>
                        </Box>
                        <Box>
                          <Text color="gray.500" fontSize="xs" textTransform="uppercase">
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
                  ),
                )}
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
                    <Text color={isSelected ? "brand.700" : "gray.800"} fontWeight="bold">
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
            <Button isDisabled={isUploading} onClick={handleModalClose} variant="ghost">
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
