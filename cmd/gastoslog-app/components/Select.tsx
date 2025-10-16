import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  TextInput,
  View,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

export type SelectItem = {
  id: string | number;
  label: string;
  value: any;
};

type InfiniteData<T> = {
  pages: Array<T[]>;
};

export type SelectProps<TItem extends SelectItem = SelectItem> = {
  multiple?: boolean;
  value?: TItem["value"] | Array<TItem["value"]> | null;
  onChange?: (item: TItem | TItem[] | null) => void;
  placeholder?: string;
  disabled?: boolean;

  // Infinite list inputs (compatible with useInfiniteQuery)
  data?: InfiniteData<TItem> | { pages?: Array<TItem[]> } | null;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;

  // Rendering
  keyExtractor?: (item: TItem) => string;
  renderItemLabel?: (item: TItem) => string;
  renderEmpty?: () => React.ReactNode;
  renderError?: (error?: unknown) => React.ReactNode;
  error?: unknown;

  // Optional search input (uncontrolled internal state)
  searchable?: boolean;
  onSearchChange?: (text: string) => void;
};

export function Select<TItem extends SelectItem = SelectItem>(
  props: SelectProps<TItem>,
) {
  const {
    multiple,
    value,
    onChange,
    placeholder = "Select...",
    disabled,
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    keyExtractor,
    renderItemLabel,
    renderEmpty,
    renderError,
    error,
    searchable,
    onSearchChange,
  } = props;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftSelectedValues, setDraftSelectedValues] = useState<
    Array<TItem["value"]>
  >([]);

  const backgroundColor = useThemeColor({}, "formElementBackgroundColor");
  const borderColor = useThemeColor({}, "borderColor");
  const color = useThemeColor({}, "formElementColor");
  const overlayBg = useThemeColor({}, "background");

  const flatData: TItem[] = useMemo(() => {
    const pages = (data?.pages ?? []) as Array<TItem[]>;
    const merged = ([] as TItem[]).concat(...pages);
    if (!searchable || !search.trim()) return merged;
    const q = search.trim().toLowerCase();
    return merged.filter((it) => {
      const label =
        (renderItemLabel ? renderItemLabel(it) : (it.label as string)) || "";
      return label.toLowerCase().includes(q);
    });
  }, [data, searchable, search, renderItemLabel]);


  const selectedValues: Array<TItem["value"]> = useMemo(() => {
    if (multiple)
      return Array.isArray(value) ? (value as Array<TItem["value"]>) : [];
    return value == null ? [] : [value as TItem["value"]];
  }, [value, multiple]);

  const selectedItem = useMemo(() => {
    if (multiple) return null;
    return (
      flatData.find((it) => it.value === (value as TItem["value"])) ?? null
    );
  }, [flatData, value, multiple]);

  const selectedItems = useMemo(() => {
    if (!multiple) return [] as TItem[];
    if (!selectedValues.length) return [] as TItem[];
    const set = new Set(selectedValues as Array<TItem["value"]>);
    return flatData.filter((it) => set.has(it.value));
  }, [flatData, multiple, selectedValues]);

  useEffect(() => {
    if (!open) return;
    if (multiple) {
      setDraftSelectedValues(selectedValues);
    }
  }, [open, multiple, selectedValues]);

  const handleSelect = useCallback(
    (item: TItem) => {
      if (multiple) {
        setDraftSelectedValues((prev) => {
          const exists = prev.some((v) => v === item.value);
          if (exists) return prev.filter((v) => v !== item.value);
          return [...prev, item.value];
        });
        return;
      }
      onChange?.(item);
      setOpen(false);
    },
    [onChange, multiple],
  );

  const defaultKeyExtractor = useCallback(
    (item: TItem) => String(item.id ?? item.value),
    [],
  );

  const renderRow = useCallback(
    ({ item }: { item: TItem }) => {
      const label = renderItemLabel
        ? renderItemLabel(item)
        : (item.label as string);
      const isSelected = multiple
        ? draftSelectedValues.some((v) => v === item.value)
        : (value as TItem["value"]) === item.value;
      return (
        <Pressable
          onPress={() => handleSelect(item)}
          style={{
            paddingHorizontal: PicoThemeVariables.formElementSpacingHorizontal,
            paddingVertical: PicoThemeVariables.formElementSpacingVertical,
            borderBottomWidth: PicoThemeVariables.borderWidth,
            borderBottomColor: borderColor,
            backgroundColor: isSelected ? overlayBg : "transparent",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <ThemedText>{label}</ThemedText>
            {isSelected ? <ThemedText>✓</ThemedText> : null}
          </View>
        </Pressable>
      );
    },
    [
      handleSelect,
      renderItemLabel,
      value,
      multiple,
      draftSelectedValues,
      borderColor,
      overlayBg,
    ],
  );

  const onEndReached = useCallback(() => {
    if (searchable && search.trim()) return; // Avoid infinite scroll while filtered locally
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage?.();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, searchable, search]);

  const header = useMemo(() => {
    if (!searchable) return null;
    // Lightweight inline input to avoid importing external components
    return (
      <View
        style={{
          paddingHorizontal: PicoThemeVariables.formElementSpacingHorizontal,
          paddingVertical: PicoThemeVariables.formElementSpacingVertical,
          borderBottomWidth: PicoThemeVariables.borderWidth,
          borderBottomColor: borderColor,
        }}
      >
        <TextInput
          value={search}
          onChangeText={(t) => {
            setSearch(t);
            onSearchChange?.(t);
          }}
          placeholder="Type to filter..."
          placeholderTextColor={color}
          style={{
            paddingVertical:
              PicoThemeVariables.formElementSpacingVertical * 0.5,
            paddingHorizontal: PicoThemeVariables.formElementSpacingHorizontal,
            borderWidth: PicoThemeVariables.borderWidth,
            borderRadius: PicoThemeVariables.borderRadius,
            borderColor,
            backgroundColor,
            color,
          }}
        />
      </View>
    );
  }, [searchable, search, borderColor, backgroundColor, color]);

  const listFooter = useMemo(() => {
    if (error && renderError) return <>{renderError(error)}</>;
    if (isFetchingNextPage) {
      return (
        <View style={{ padding: PicoThemeVariables.spacing }}>
          <ActivityIndicator />
        </View>
      );
    }
    if (!isLoading && flatData.length === 0 && renderEmpty)
      return <>{renderEmpty()}</>;
    return null;
  }, [
    error,
    renderError,
    isFetchingNextPage,
    isLoading,
    flatData.length,
    renderEmpty,
  ]);

  const selectedSummary = useMemo(() => {
    if (!multiple)
      return selectedItem
        ? renderItemLabel
          ? renderItemLabel(selectedItem)
          : (selectedItem.label as string)
        : placeholder;
    if (!selectedItems.length) return placeholder;
    const labels = selectedItems.map((it) =>
      renderItemLabel ? renderItemLabel(it) : (it.label as string),
    );
    if (labels.length <= 2) return labels.join(", ");
    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
  }, [multiple, selectedItem, selectedItems, placeholder, renderItemLabel]);

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
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
          borderColor,
          borderRadius: PicoThemeVariables.borderRadius,
          backgroundColor,
          boxShadow: "none" as any,
          justifyContent: "center",
        }}
      >
        <ThemedText style={{ color }}>{selectedSummary}</ThemedText>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "flex-end",
          }}
        >
          <ThemedView
            style={{
              maxHeight: "70%",
              backgroundColor,
              borderTopLeftRadius: PicoThemeVariables.borderRadius * 2,
              borderTopRightRadius: PicoThemeVariables.borderRadius * 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal:
                  PicoThemeVariables.formElementSpacingHorizontal,
                paddingVertical: PicoThemeVariables.formElementSpacingVertical,
                borderBottomWidth: PicoThemeVariables.borderWidth,
                borderBottomColor: borderColor,
              }}
            >
              <ThemedText style={{ fontWeight: "600" }}>Select</ThemedText>
              {multiple ? (
                <View
                  style={{
                    flexDirection: "row",
                    gap: PicoThemeVariables.spacing,
                  }}
                >
                  <Pressable onPress={() => setOpen(false)}>
                    <ThemedText>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      const set = new Set(draftSelectedValues);
                      const items = flatData.filter((it) => set.has(it.value));
                      onChange?.(items);
                      setOpen(false);
                    }}
                  >
                    <ThemedText style={{ fontWeight: "600" }}>Done</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setOpen(false)}>
                  <ThemedText>Close</ThemedText>
                </Pressable>
              )}
            </View>

            {header}

            {isLoading && flatData.length === 0 ? (
              <View style={{ padding: PicoThemeVariables.spacing }}>
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={flatData}
                keyExtractor={keyExtractor ?? defaultKeyExtractor}
                renderItem={renderRow}
                onEndReachedThreshold={0.5}
                onEndReached={onEndReached}
                ListFooterComponent={listFooter}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </ThemedView>
        </View>
      </Modal>
    </>
  );
}

export default Select;
