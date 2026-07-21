import { ThemedText, type ThemedTextProps } from "./ThemedText";
import { fromCentToRegularPrice } from "@/services/string";
import { PicoThemeVariables } from "@/styles/pico-lime";

export type AmountTone = "default" | "primary" | "muted";

export type AmountProps = Omit<ThemedTextProps, "children"> & {
  cents: number;
  sign?: "+" | "-";
  tone?: AmountTone;
};

const TONE_COLOR: Record<AmountTone, string | undefined> = {
  default: undefined,
  primary: PicoThemeVariables.primaryColor,
  muted: undefined,
};

export function Amount({ cents, sign, tone = "default", style, type, ...rest }: AmountProps) {
  const formatted = fromCentToRegularPrice(cents, { type: "withDecimal" });
  const color = TONE_COLOR[tone];

  return (
    <ThemedText
      type={tone === "muted" ? "muted" : type}
      style={[color ? { color } : undefined, style]}
      {...rest}
    >
      {sign ? `${sign}${formatted}` : formatted}
    </ThemedText>
  );
}
