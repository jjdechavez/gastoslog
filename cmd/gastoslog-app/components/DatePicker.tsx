import React, { useState } from "react";
import { Platform, TouchableOpacity, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "./ThemedText";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { useThemeColor } from "@/hooks/useThemeColor";

export interface DatePickerProps {
  value?: Date | string;
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

    const dateValue = props.value
      ? typeof props.value === "string"
        ? new Date(props.value)
        : props.value
      : undefined;

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
      // Deliberately a plain View, not ThemedView.
      //
      // ThemedView paints the theme's `background` token, which is a different
      // colour from the input's `formElementBackgroundColor` — in dark mode
      // #13161e vs rgb(28,33,43.5). The wrapper therefore showed through
      // around the control as a mismatched halo, and inside a Card (whose
      // background differs again) it looked like the input belonged to a
      // different surface.
      //
      // The native picker renders inline below the control, so this wrapper has
      // to stay layout-only. `Input` needs no equivalent wrapper because
      // TextInput paints its own background edge to edge.
      <View>
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
                color: dateValue ? color : placeholderColor,
              },
            ]}
          >
            {dateValue
              ? formatDate(dateValue)
              : props.placeholder || "Select date"}
          </ThemedText>
          <ThemedText style={styles.icon}>📅</ThemedText>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dateValue || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateChange}
            maximumDate={props.maximumDate}
            minimumDate={props.minimumDate}
          />
        )}
      </View>
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
