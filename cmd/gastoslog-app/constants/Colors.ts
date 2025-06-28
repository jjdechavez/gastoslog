/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { PicoDarkThemeVariables, PicoThemeVariables } from "@/styles/pico-lime";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: PicoThemeVariables.textColor,
    textMuted: PicoThemeVariables.mutedColor,
    textDeletedColor: PicoThemeVariables.deteledColor,
    h1: PicoThemeVariables.h1Color,
    h2: PicoThemeVariables.h2Color,
    h3: PicoThemeVariables.h3Color,
    h4: PicoThemeVariables.h4Color,
    h5: PicoThemeVariables.h5Color,
    h6: PicoThemeVariables.h6Color,
    background: PicoThemeVariables.backgroundColor,
    borderColor: PicoThemeVariables.formElementBorder,
    formElementBackgroundColor: PicoThemeVariables.formElementBackground,
    formElementColor: PicoThemeVariables.formElementColor,
    formElementPlaceholderColor: PicoThemeVariables.formElementPlaceholderColor,
    formElementInvalidBorder: PicoThemeVariables.formElementInvalidBorder,
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
    cardBackground: PicoThemeVariables.cardBackground,
  },
  dark: {
    text: PicoDarkThemeVariables.textColor,
    textMuted: PicoDarkThemeVariables.mutedColor,
    textDeletedColor: PicoThemeVariables.deteledColor,
    h1: PicoDarkThemeVariables.h1Color,
    h2: PicoDarkThemeVariables.h2Color,
    h3: PicoDarkThemeVariables.h3Color,
    h4: PicoDarkThemeVariables.h4Color,
    h5: PicoDarkThemeVariables.h5Color,
    h6: PicoDarkThemeVariables.h6Color,
    background: PicoDarkThemeVariables.backgroundColor,
    borderColor: PicoDarkThemeVariables.formElementBorder,
    formElementBackgroundColor: PicoDarkThemeVariables.formElementBackground,
    formElementColor: PicoDarkThemeVariables.formElementColor,
    formElementPlaceholderColor:
      PicoDarkThemeVariables.formElementPlaceholderColor,
    formElementInvalidBorder: PicoDarkThemeVariables.formElementInvalidBorder,
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
    cardBackground: PicoDarkThemeVariables.cardBackground,
  },
};
