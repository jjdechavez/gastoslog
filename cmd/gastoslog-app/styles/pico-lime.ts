import { StyleSheet, Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get("window");

export const PicoThemeVariables = {
  // Typography
  fontFamily: "system-ui",
  lineHeight: 1.5,
  fontWeight: "400",
  fontSize: 16,
  headerFontWeight: "700",

  // Spacing
  spacing: 16,
  typographySpacingVertical: 16,
  blockSpacingVertical: 16,
  blockSpacingHorizontal: 16,

  // Borders
  borderRadius: 8,
  borderWidth: 1,
  outlineWidth: 2,

  // Colors (Light theme as default)
  backgroundColor: "#fff",
  textColor: "#373c44",
  mutedColor: "#646b79",
  mutedBorderColor: "rgb(231, 234, 239.5)",

  // Primary colors
  primaryColor: "#577400",
  primaryBackground: "#a5d601",
  primaryBorder: "#a5d601",
  primaryHover: "#435a00",
  primaryHoverBackground: "#99c801",
  primaryFocus: "rgba(119, 156, 0, 0.5)",
  primaryInverse: "#000",

  // Secondary colors
  secondaryColor: "#5d6b89",
  secondaryBackground: "#525f7a",
  secondaryBorder: "#525f7a",
  secondaryHover: "#48536b",
  secondaryHoverBackground: "#48536b",
  secondaryFocus: "rgba(93, 107, 137, 0.25)",
  secondaryInverse: "#fff",

  // Contrast colors
  contrastColor: "#181c25",
  contrastBackground: "#181c25",
  contrastBorder: "#181c25",
  contrastHover: "#000",
  contrastHoverBackground: "#000",
  contrastInverse: "#fff",

  // Heading colors
  h1Color: "#2d3138",
  h2Color: "#373c44",
  h3Color: "#424751",
  h4Color: "#4d535e",
  h5Color: "#5c6370",
  h6Color: "#646b79",

  // Form elements
  formElementBackground: "rgb(251, 251.5, 252.25)",
  formElementSelectedBackground: "#dfe3eb",
  formElementBorder: "#cfd5e2",
  formElementColor: "#23262c",
  formElementPlaceholder: "#646b79",
  formElementActiveBackground: "#fff",
  formElementActiveBorder: "#a5d601",
  formElementFocus: "#a5d601",
  formElementDisabledOpacity: 0.5,

  // Validation colors
  formElementInvalidBorder: "rgb(183.5, 105.5, 106.5)",
  formElementInvalidActiveBorder: "rgb(200.25, 79.25, 72.25)",
  formElementValidBorder: "rgb(76, 154.5, 137.5)",
  formElementValidActiveBorder: "rgb(39, 152.75, 118.75)",

  // Card colors
  cardBackground: "#fff",
  cardBorder: "rgb(231, 234, 239.5)",
  cardSectioningBackground: "rgb(251, 251.5, 252.25)",

  // Shadow
  boxShadow: {
    shadowColor: "#8191b5",
    shadowOffset: { width: 0.0145, height: 0.029 },
    shadowOpacity: 0.01698,
    shadowRadius: 0.174,
    elevation: 2,
  },
} as const;

// For dark theme
export const PicoDarkThemeVariables = {
  ...PicoThemeVariables,
  // Base colors
  backgroundColor: "#13161e",
  textColor: "#c2c7d0",
  mutedColor: "#7b8495",
  mutedBorderColor: "#202632",

  // Primary colors
  primaryColor: "#82ab00",
  primaryBackground: "#a5d601",
  primaryBorder: "#a5d601",
  primaryHover: "#99c801",
  primaryHoverBackground: "#b2e51a",
  primaryFocus: "rgba(130, 171, 0, 0.375)",
  primaryInverse: "#000",

  // Secondary colors
  secondaryColor: "#969eaf",
  secondaryBackground: "#525f7a",
  secondaryBorder: "#525f7a",
  secondaryHover: "#b3b9c5",
  secondaryHoverBackground: "#5d6b89",
  secondaryFocus: "rgba(144, 158, 190, 0.25)",
  secondaryInverse: "#fff",

  // Contrast colors
  contrastColor: "#dfe3eb",
  contrastBackground: "#eff1f4",
  contrastBorder: "#eff1f4",
  contrastHover: "#fff",
  contrastHoverBackground: "#fff",
  contrastInverse: "#000",

  // Heading colors
  h1Color: "#f0f1f3",
  h2Color: "#e0e3e7",
  h3Color: "#c2c7d0",
  h4Color: "#b3b9c5",
  h5Color: "#a4acba",
  h6Color: "#8891a4",

  // Form elements
  formElementBackground: "rgb(28, 33, 43.5)",
  formElementSelectedBackground: "#2a3140",
  formElementBorder: "#2a3140",
  formElementColor: "#e0e3e7",
  formElementPlaceholder: "#8891a4",
  formElementActiveBackground: "rgb(26, 30.5, 40.25)",
  formElementActiveBorder: "#a5d601",
  formElementFocus: "#a5d601",
  formElementDisabledOpacity: 0.5,

  // Validation colors
  formElementInvalidBorder: "rgb(149.5, 74, 80)",
  formElementInvalidActiveBorder: "rgb(183.25, 63.5, 59)",
  formElementValidBorder: "#2a7b6f",
  formElementValidActiveBorder: "rgb(22, 137, 105.5)",

  // Card colors
  cardBackground: "#181c25",
  cardBorder: "#181c25",
  cardSectioningBackground: "rgb(26, 30.5, 40.25)",

  // Shadow
  boxShadow: {
    shadowColor: "rgb(7, 8.5, 12)",
    shadowOffset: { width: 0.0145, height: 0.029 },
    shadowOpacity: 0.01698,
    shadowRadius: 0.174,
    elevation: 2,
  },
};

export const PicoLimeStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    paddingHorizontal: PicoThemeVariables.spacing,
    paddingTop: 52,
  },
  section: {
    paddingVertical: 24,
  },

  // Typography
  h1: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 16,
    color: PicoThemeVariables.h1Color,
  },
  h2: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
    color: PicoThemeVariables.h2Color,
  },
  h3: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 8,
    color: PicoThemeVariables.h3Color,
  },
  p: {
    marginBottom: 16,
    lineHeight: 24,
    color: PicoThemeVariables.textColor,
    fontSize: 16,
  },
  small: {
    fontSize: 12,
    color: PicoThemeVariables.mutedColor,
  },

  // Buttons
  button: {
    backgroundColor: PicoThemeVariables.primaryBackground,
    borderWidth: PicoThemeVariables.borderWidth,
    borderColor: PicoThemeVariables.primaryBorder,
    borderRadius: PicoThemeVariables.borderRadius,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  buttonText: {
    color: PicoThemeVariables.primaryInverse,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonPrimary: {
    backgroundColor: PicoThemeVariables.primaryColor,
    borderColor: PicoThemeVariables.primaryBorder,
  },
  buttonPrimaryText: {
    color: PicoThemeVariables.primaryInverse,
  },
  buttonSecondary: {
    backgroundColor: PicoThemeVariables.secondaryColor,
    borderColor: PicoThemeVariables.secondaryBorder,
  },
  buttonSecondaryText: {
    color: PicoThemeVariables.secondaryInverse,
  },

  // Forms
  input: {
    borderWidth: PicoThemeVariables.borderWidth,
    borderColor: PicoThemeVariables.formElementBorder,
    borderRadius: PicoThemeVariables.borderRadius,
    padding: 12,
    fontSize: 16,
    backgroundColor: PicoThemeVariables.formElementBackground,
    marginBottom: 16,
    color: PicoThemeVariables.formElementColor,
    minHeight: 44,
  },
  select: {
    borderWidth: PicoThemeVariables.borderWidth,
    borderColor: PicoThemeVariables.formElementBorder,
    borderRadius: PicoThemeVariables.borderRadius,
    padding: 12,
    fontSize: 16,
    backgroundColor: PicoThemeVariables.formElementBackground,
    color: PicoThemeVariables.formElementColor,
    minHeight: 44,
  },
  label: {
    marginBottom: 8,
    fontWeight: "500",
    color: PicoThemeVariables.textColor,
    fontSize: 16,
  },

  // Cards
  card: {
    backgroundColor: PicoThemeVariables.cardBackground,
    borderRadius: PicoThemeVariables.borderRadius,
    padding: 16,
    marginBottom: 16,
    borderWidth: PicoThemeVariables.borderWidth,
    borderColor: PicoThemeVariables.cardBorder,
    ...PicoThemeVariables.boxShadow,
  },
  cardImage: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: PicoThemeVariables.borderRadius,
    borderTopRightRadius: PicoThemeVariables.borderRadius,
  },
  cardContent: {
    padding: 16,
    backgroundColor: PicoThemeVariables.cardSectioningBackground,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: PicoThemeVariables.textColor,
  },
  cardText: {
    fontSize: 14,
    color: PicoThemeVariables.mutedColor,
    marginBottom: 12,
    lineHeight: 20,
  },

  // Navigation
  nav: {
    paddingVertical: 12,
    borderBottomWidth: PicoThemeVariables.borderWidth,
    borderBottomColor: PicoThemeVariables.mutedBorderColor,
    backgroundColor: PicoThemeVariables.backgroundColor,
  },
  navItem: {
    marginRight: 16,
    color: PicoThemeVariables.textColor,
    fontSize: 16,
  },

  // Colors (Lime theme specific)
  primary: {
    color: PicoThemeVariables.primaryColor,
  },
  primaryBg: {
    backgroundColor: PicoThemeVariables.primaryColor,
  },
  secondary: {
    color: PicoThemeVariables.secondaryColor,
  },
  secondaryBg: {
    backgroundColor: PicoThemeVariables.secondaryColor,
  },
  contrast: {
    color: PicoThemeVariables.contrastColor,
  },
  contrastBg: {
    backgroundColor: PicoThemeVariables.contrastColor,
  },

  // Utilities
  textCenter: {
    textAlign: "center",
  },
  textMuted: {
    color: PicoThemeVariables.mutedColor,
  },
  mt1: { marginTop: 4 },
  mt2: { marginTop: 8 },
  mt3: { marginTop: 16 },
  mb1: { marginBottom: 4 },
  mb2: { marginBottom: 8 },
  mb3: { marginBottom: 16 },
  p1: { padding: 4 },
  p2: { padding: 8 },
  p3: { padding: 16 },

  // Mobile-specific utilities
  fullWidth: {
    width: screenWidth - PicoThemeVariables.spacing * 2,
  },
  safeArea: {
    flex: 1,
    backgroundColor: PicoThemeVariables.backgroundColor,
  },
  scrollView: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  spaceBetween: {
    justifyContent: "space-between",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
