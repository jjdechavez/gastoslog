import { View, type ViewProps } from "react-native";

import { PicoThemeVariables } from "@/styles/pico-lime";
import { useThemeColor } from "@/hooks/useThemeColor";

type CardProps = ViewProps;

export function Card({ children, style, ...props }: CardProps) {
  const backgroundColor = useThemeColor({}, "cardBackground");

  return (
    <View
      style={[
        {
          marginBottom: PicoThemeVariables.blockSpacingVertical,
          paddingVertical: PicoThemeVariables.blockSpacingVertical,
          paddingHorizontal: PicoThemeVariables.blockSpacingHorizontal,
          borderRadius: PicoThemeVariables.borderRadius,
          backgroundColor,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

type CardHeaderProps = ViewProps;

export function CardHeader({ children, style, ...props }: CardHeaderProps) {
  return (
    <View
      style={[
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

type CardBodyProps = ViewProps;

export function CardBody({ children, style, ...props }: CardBodyProps) {
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
}

type CardFooterProps = ViewProps;

export function CardFooter({ children, style, ...props }: CardFooterProps) {
  const borderColor = useThemeColor({}, "borderColor");

  return (
    <View
      style={[
        {
          marginTop: PicoThemeVariables.spacing,
          paddingTop: PicoThemeVariables.spacing,
          borderTopWidth: 1,
          borderTopColor: borderColor,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
