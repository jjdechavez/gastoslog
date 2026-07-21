import { View, type StyleProp, type ViewStyle } from "react-native";

import { Row } from "./Row";
import { Button, ButtonText } from "./Button";
import { PicoThemeVariables } from "@/styles/pico-lime";

export type SegmentedControlOption<TValue extends string | number> = {
  label: string;
  value: TValue;
};

export type SegmentedControlProps<TValue extends string | number> = {
  options: readonly SegmentedControlOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<TValue extends string | number>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<TValue>) {
  return (
    <Row justify="flex-start" gap={8} style={style}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <View key={String(option.value)} style={{ flex: 1 }}>
            <Button
              onPressIn={() => onChange(option.value)}
              style={{
                backgroundColor: active
                  ? PicoThemeVariables.primaryBackground
                  : "transparent",
                borderColor: PicoThemeVariables.formElementBorder,
              }}
            >
              <ButtonText
                style={{
                  color: active
                    ? PicoThemeVariables.primaryInverse
                    : PicoThemeVariables.textColor,
                }}
              >
                {option.label}
              </ButtonText>
            </Button>
          </View>
        );
      })}
    </Row>
  );
}
