import { CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";
import { Badge, HStack, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { getHealth } from "../lib/api";

type Status = "checking" | "online" | "offline";

export function ApiStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const controller = new AbortController();

    getHealth(controller.signal)
      .then(() => setStatus("online"))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("offline");
      });

    return () => controller.abort();
  }, []);

  if (status === "checking") {
    return (
      <HStack color="gray.500">
        <Spinner size="xs" />
        <Text fontSize="sm">Checking API</Text>
      </HStack>
    );
  }

  const online = status === "online";

  return (
    <Badge
      alignItems="center"
      colorScheme={online ? "green" : "orange"}
      display="inline-flex"
      gap={2}
      px={3}
      py={1.5}
      rounded="full"
      textTransform="none"
    >
      {online ? <CheckCircleIcon /> : <WarningIcon />}
      API {online ? "online" : "unavailable"}
    </Badge>
  );
}
