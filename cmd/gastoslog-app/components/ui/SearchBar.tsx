import React, { useRef } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

import { HStack } from "../HStack";
import { IStyle } from "../base";
import { IconSymbol } from "./IconSymbol";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { useThemeColor } from "@/hooks/useThemeColor";
import { DebounceInput } from "../DebounceInput";

interface ISearchBarProps extends IStyle<ViewStyle> {
  value?: string;
  onSearch?: (val: string) => void;
}

export const SearchBar: React.FC<ISearchBarProps> = ({
  onSearch,
  value = "",
  children,
  ...style
}) => {
  const backgroundColor = useThemeColor({}, "formElementBackgroundColor");
  const color = useThemeColor({}, "formElementColor");

  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        width: "100%",
        marginBottom: 16,
      }}
    >
      <HStack
        width={"100%"}
        height={50}
        borderRadius={4}
        paddingLeft={PicoThemeVariables.formElementSpacingHorizontal + 28}
        justifyContent={"flex-start"}
        backgroundColor={backgroundColor}
        {...style}
      >
        <DebounceInput
          ref={inputRef}
          value={value}
          placeholder="Search"
          onChangeText={onSearch}
          style={{
            paddingVertical: PicoThemeVariables.formElementSpacingVertical,
            color,
          }}
        />
        <IconSymbol
          name="magnifyingglass"
          size={20}
          color="#c8cdd6"
          style={searchBarStyle.icon}
        />
      </HStack>
    </TouchableOpacity>
  );
};

const searchBarStyle = StyleSheet.create({
  icon: {
    position: "absolute",
    left: 12,
    zIndex: 1,
    color: "#8891a4",
  },
});
