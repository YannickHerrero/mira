import type { Theme } from "@react-navigation/native";

const NAV_FONT_FAMILY = "Raleway";

export const NAV_THEME = {
  background: "hsl(232 23% 18%)", // Base #24273A
  border: "hsl(231 16% 34%)", // Surface 1 #494D64
  card: "hsl(230 19% 26%)", // Surface 0 #363A4F
  notification: "hsl(351 74% 73%)", // Red #ED8796
  primary: "hsl(234 82% 85%)", // Lavender #B7BDF8
  text: "hsl(227 68% 88%)", // Text #CAD3F5
};

export const DARK_THEME: Theme = {
  dark: true,
  fonts: {
    regular: {
      fontFamily: NAV_FONT_FAMILY,
      fontWeight: "400",
    },
    medium: {
      fontFamily: NAV_FONT_FAMILY,
      fontWeight: "500",
    },
    bold: {
      fontFamily: NAV_FONT_FAMILY,
      fontWeight: "700",
    },
    heavy: {
      fontFamily: NAV_FONT_FAMILY,
      fontWeight: "800",
    },
  },
  colors: NAV_THEME,
};
