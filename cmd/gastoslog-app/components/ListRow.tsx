import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { Row } from "./Row";
import { ThemedText } from "./ThemedText";

export type ListRowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({ title, subtitle, right, style }: ListRowProps) {
  return (
    <Row align="center" style={style}>
      <View style={{ flex: 1, marginRight: 12 }}>
        {typeof title === "string" ? (
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {title}
          </ThemedText>
        ) : (
          title
        )}
        {subtitle ? (
          typeof subtitle === "string" ? (
            <ThemedText type="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {subtitle}
            </ThemedText>
          ) : (
            subtitle
          )
        ) : null}
      </View>
      {right}
    </Row>
  );
}
