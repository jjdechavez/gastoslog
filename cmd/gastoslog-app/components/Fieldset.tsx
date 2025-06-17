import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedText } from "./ThemedText";
import { ThemedView, ThemedViewProps } from "./ThemedView";
import { PicoThemeVariables } from "@/styles/pico-lime";

export const Fieldset = (props: ThemedViewProps) => {
  return <ThemedView {...props}>{props.children}</ThemedView>;
};

type LabelProps = {
  name: string;
  required?: boolean;
};

export const Label = (props: LabelProps) => {
  const requiredColor = useThemeColor({}, "formElementInvalidBorder");
  const labelColor = useThemeColor({}, "text");

  let requiredContent = null;
  if (props?.required) {
    requiredContent = (
      <ThemedText
        style={{
          color: requiredColor,
        }}
      >
        *
      </ThemedText>
    );
  }

  return (
    <ThemedText
      style={{
        marginBottom: PicoThemeVariables.spacing * 0.375,
        color: labelColor,
      }}
    >
      {props.name} {requiredContent}
    </ThemedText>
  );
};
