import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  fonts: {
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  colors: {
    brand: {
      50: "#e8f8f3",
      100: "#c5ebdf",
      200: "#9dddc9",
      300: "#70cfb2",
      400: "#43c09b",
      500: "#28a782",
      600: "#1d8265",
      700: "#155d49",
      800: "#0c392d",
      900: "#041711",
    },
  },
  styles: {
    global: {
      body: {
        bg: "gray.50",
        color: "gray.800",
      },
    },
  },
});
