import React, { useRef } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

import { HStack } from "../HStack";
import { Text } from "../../styles/text";
import { IStyle } from "../base";
import globalStyles from "../../styles/global";
import { IconSymbol } from "./IconSymbol";
import { Input } from "../Input";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { useThemeColor } from "@/hooks/useThemeColor";

interface ISearchBarProps extends IStyle<ViewStyle> {
  onSearch?: (val: string) => void;
}

const SearchBarComponent: React.FC<ISearchBarProps> = ({
  onSearch,
  children,
  ...style
}) => {
  const backgroundColor = useThemeColor({}, "formElementBackgroundColor");

  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={globalStyles.fullWidth}>
      <HStack
        width={"100%"}
        height={38}
        borderRadius={4}
        padding={12}
        paddingLeft={44}
        justifyContent={"flex-start"}
        backgroundColor={backgroundColor}
        {...style}
      >
        <Input
          ref={inputRef}
          placeholder="Search"
          placeholderTextColor={"#858489"}
          onChangeText={onSearch}
          style={{
            paddingVertical: PicoThemeVariables.formElementSpacingVertical,
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

export const SearchBar = React.memo(SearchBarComponent);

const searchBarStyle = StyleSheet.create({
  icon: {
    position: "absolute",
    left: 12,
    zIndex: 1,
    color: "#858489",
  },
});
