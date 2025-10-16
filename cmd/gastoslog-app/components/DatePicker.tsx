import React, { useState } from "react";
import { Platform, TouchableOpacity, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { useThemeColor } from "@/hooks/useThemeColor";

export interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  style?: any;
}

export const DatePicker = React.forwardRef<any, DatePickerProps>(
  (props, ref) => {
    const [showDatePicker, setShowDatePicker] = useState(false);

    const backgroundColor = useThemeColor({}, "formElementBackgroundColor");
    const borderColor = useThemeColor({}, "borderColor");
    const color = useThemeColor({}, "formElementColor");
    const placeholderColor = useThemeColor({}, "formElementPlaceholderColor");

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    };

    const onDateChange = (event: any, date?: Date) => {
      setShowDatePicker(false);
      if (date && props.onChange) {
        props.onChange(date);
      }
    };

    const showDatePickerModal = () => {
      setShowDatePicker(true);
    };

    return (
      <ThemedView>
        <TouchableOpacity
          ref={ref}
          style={[
            styles.input,
            {
              backgroundColor,
              borderColor,
              color,
            },
            props.style,
          ]}
          onPress={showDatePickerModal}
          activeOpacity={0.7}
        >
          <ThemedText
            style={[
              styles.text,
              {
                color: props.value ? color : placeholderColor,
              },
            ]}
          >
            {props.value
              ? formatDate(props.value)
              : props.placeholder || "Select date"}
          </ThemedText>
          <ThemedText style={styles.icon}>📅</ThemedText>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={props.value}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
            maximumDate={props.maximumDate}
            minimumDate={props.minimumDate}
          />
        )}
      </ThemedView>
    );
  },
);

const styles = StyleSheet.create({
  input: {
    marginBottom: PicoThemeVariables.spacing,
    paddingVertical: PicoThemeVariables.formElementSpacingVertical,
    paddingHorizontal: PicoThemeVariables.formElementSpacingHorizontal,
    width: "100%",
    height:
      16 * PicoThemeVariables.lineHeight +
      PicoThemeVariables.formElementSpacingVertical * 2 +
      PicoThemeVariables.borderWidth * 2,
    borderWidth: PicoThemeVariables.borderWidth,
    borderStyle: "solid",
    borderRadius: PicoThemeVariables.borderRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  text: {
    flex: 1,
    fontWeight: PicoThemeVariables.fontWeight,
  },
  icon: {
    fontSize: 16,
    marginLeft: 8,
  },
});
