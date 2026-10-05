import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { DatePicker } from "@/components/DatePicker";
import { OutlineButton } from "@/components/Button";
import { FilterChip } from "@/components/FilterChip";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { PicoColors, PicoThemeVariables } from "@/styles/pico-lime";
import {
  type DateRange,
  type DateRangeError,
  datePresetLabels,
  datePresets,
  formatRangeLabel,
  matchPreset,
  resolvePreset,
  toISODate,
  validateDateRange,
} from "@/services/date";

export type DateRangePickerProps = {
  /** The committed range. `{}` means "no date filter". */
  value?: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  /** Latest selectable day. Defaults to today. */
  maximumDate?: Date;
  style?: StyleProp<ViewStyle>;
  /**
   * "chip" renders a compact trigger for use inside a horizontal filter row;
   * "input" (default) is the full-width form-element trigger used in forms.
   * The sheet itself is identical either way.
   */
  variant?: "input" | "chip";
};

const ERROR_MESSAGES: Record<Exclude<DateRangeError, null>, string> = {
  incomplete: "Pick both a start and end date.",
  reversed: "The end date can't be before the start date.",
  future: "Expenses can't be dated in the future.",
  tooLong: "Pick a range of a year or less.",
};

/**
 * A date-range filter: preset chips plus a custom from/to range.
 *
 * Better than a single-date picker because "one specific day" is the rare ask —
 * people usually want "this month" or "last week", which a preset answers in one
 * tap. The custom range covers everything else.
 *
 * Edits live in a local draft and commit only on Apply, so dragging the native
 * date wheel doesn't fire a query per frame.
 */
export function DateRangePicker(props: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(props.value ?? {});

  const backgroundColor = useThemeColor({}, "formElementBackgroundColor");
  const borderColor = useThemeColor({}, "borderColor");
  const textColor = useThemeColor({}, "formElementColor");
  const placeholderColor = useThemeColor(
    {},
    "formElementPlaceholderColor",
  );

  const maximumDate = props.maximumDate ?? new Date();
  const maxISODate = toISODate(maximumDate);

  // Seed the draft when the sheet OPENS, keyed on the open *transition* only.
  //
  // Depends on committed.from/.to (primitives) rather than props.value, which
  // the parent rebuilds as a fresh object literal on every render. Keying on the
  // object would re-seed — and wipe an in-progress edit — on every parent
  // render, e.g. when a background refetch resolves while the user is typing.
  // Depends on neither, so a re-render mid-edit can't clobber the draft.
  const committed = props.value ?? {};
  const committedFrom = committed.from;
  const committedTo = committed.to;

  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraft({ from: committedFrom, to: committedTo });
    }
    wasOpen.current = open;
  }, [open, committedFrom, committedTo]);

  // The trigger's displayed state comes from the COMMITTED value, never from the
  // draft.
  //
  // This is the fix for a real bug: the chip used to render from `draft`, which
  // only re-synced while the sheet was open. So clearing the filter updated the
  // URL but left the chip showing the old date, and tapping a preset then Cancel
  // left the chip lying too. Reading committed state here makes the two
  // structurally incapable of desyncing.
  const committedHasFilter = Boolean(committedFrom || committedTo);

  // While the sheet is open the draft is what the user is editing, so the chip
  // previews it; once closed, the chip falls back to committed state.
  const preview = open ? draft : { from: committedFrom, to: committedTo };
  const previewHasFilter = Boolean(preview.from || preview.to);
  const previewPreset = matchPreset(preview, maxISODate);

  // Sheet-local validation/state.
  const error = validateDateRange(draft, maxISODate);
  const activePreset = matchPreset(draft, maxISODate);

  const label = previewHasFilter
    ? previewPreset
      ? datePresetLabels[previewPreset]
      : formatRangeLabel(preview)
    : (props.placeholder ?? "Any date");

  const commit = (range: DateRange) => {
    props.onChange(range);
    setDraft(range);
    setOpen(false);
  };

  const clear = () => {
    props.onChange({});
    setDraft({});
    setOpen(false);
  };

  const trigger =
    props.variant === "chip" ? (
      <FilterChip
        label={label}
        active={previewHasFilter}
        onPress={() => setOpen(true)}
        onClear={committedHasFilter ? () => props.onChange({}) : undefined}
        accessibilityLabel={`Filter by date, currently ${label}`}
        style={props.style}
      />
    ) : (
      <View style={styles.triggerRow}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Filter by date, currently ${label}`}
          style={[
            styles.trigger,
            { backgroundColor, borderColor },
            props.style,
          ]}
        >
          <ThemedText
            numberOfLines={1}
            style={[
              styles.triggerText,
              { color: previewHasFilter ? textColor : placeholderColor },
            ]}
          >
            {label}
          </ThemedText>
          <ThemedText style={styles.triggerIcon}>📅</ThemedText>
        </Pressable>

        {committedHasFilter ? (
          <Pressable
            onPress={() => props.onChange({})}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear date filter"
            style={styles.clearButton}
          >
            <ThemedText type="muted">✕</ThemedText>
          </Pressable>
        ) : null}
      </View>
    );

  return (
    <>
      {trigger}

      <DateRangeSheet
        open={open}
        draft={draft}
        error={error}
        activePreset={activePreset}
        maximumDate={maximumDate}
        maxISODate={maxISODate}
        onClose={() => {
          // Discard: the draft never reached props.value, so restore the
          // committed range rather than leaving the edit in place.
          setDraft({ from: committedFrom, to: committedTo });
          setOpen(false);
        }}
        onChangeDraft={setDraft}
        onApply={() => commit(draft)}
        onClear={clear}
      />
    </>
  );
}

type DateRangeSheetProps = {
  open: boolean;
  draft: DateRange;
  error: DateRangeError;
  activePreset: (typeof datePresets)[number] | null;
  maximumDate: Date;
  maxISODate: string;
  onClose: () => void;
  onChangeDraft: (range: DateRange) => void;
  onApply: () => void;
  onClear: () => void;
};

function DateRangeSheet(props: DateRangeSheetProps) {
  const backgroundColor = useThemeColor({}, "formElementBackgroundColor");
  const borderColor = useThemeColor({}, "borderColor");

  return (
    <Modal
      visible={props.open}
      animationType="slide"
      transparent
      onRequestClose={props.onClose}
    >
      <View style={styles.backdrop}>
        <ThemedView
          style={[
            styles.sheet,
            {
              backgroundColor,
              borderTopLeftRadius: PicoThemeVariables.borderRadius * 2,
              borderTopRightRadius: PicoThemeVariables.borderRadius * 2,
            },
          ]}
        >
          <View style={[styles.sheetHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={props.onClose} hitSlop={8}>
              <ThemedText type="muted">Cancel</ThemedText>
            </Pressable>

            <ThemedText type="defaultSemiBold">Filter by date</ThemedText>

            <Pressable
              onPress={props.onApply}
              disabled={props.error !== null}
              hitSlop={8}
            >
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.applyLabel,
                  props.error !== null ? styles.disabled : undefined,
                ]}
              >
                Apply
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetBody}
          >
            {/* What you're about to apply, pinned above the fold. Previously the
                only summary sat at the bottom of the scroll, so you couldn't
                see what you were editing without scrolling. */}
            <View style={[styles.rangeSummary, { borderColor }]}>
              <ThemedText type="label" style={styles.summaryLabel}>
                {props.draft.from || props.draft.to
                  ? formatRangeLabel(props.draft)
                  : "Showing every expense"}
              </ThemedText>
              {props.activePreset ? (
                <ThemedText type="caption">
                  {datePresetLabels[props.activePreset]}
                </ThemedText>
              ) : null}
            </View>

            <ThemedText type="muted" style={styles.sectionLabel}>
              Quick range
            </ThemedText>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetRow}
            >
              {datePresets.map((preset) => (
                <OutlineButton
                  key={preset}
                  label={datePresetLabels[preset]}
                  active={props.activePreset === preset}
                  onPress={() => props.onChangeDraft(resolvePreset(preset))}
                />
              ))}
            </ScrollView>

            <ThemedText type="muted" style={styles.sectionLabel}>
              Custom range
            </ThemedText>

            <View style={styles.customRow}>
              <View style={styles.customField}>
                <ThemedText type="label" style={styles.fieldLabel}>
                  From
                </ThemedText>
                <DatePicker
                  value={props.draft.from}
                  onChange={(date) =>
                    props.onChangeDraft({ ...props.draft, from: toISODate(date) })
                  }
                  placeholder="Start date"
                  maximumDate={props.maximumDate}
                />
              </View>

              <View style={styles.customField}>
                <ThemedText type="label" style={styles.fieldLabel}>
                  To
                </ThemedText>
                <DatePicker
                  value={props.draft.to}
                  onChange={(date) =>
                    props.onChangeDraft({ ...props.draft, to: toISODate(date) })
                  }
                  placeholder="End date"
                  maximumDate={props.maximumDate}
                />
              </View>
            </View>

            {props.error ? (
              <ThemedText type="small" style={styles.errorText}>
                {ERROR_MESSAGES[props.error]}
              </ThemedText>
            ) : null}

            {/* Only offer "clear" when there is something to clear. Always
                rendering it gave a tappable no-op on an unfiltered sheet. */}
            {props.draft.from || props.draft.to ? (
              <Pressable
                onPress={props.onClear}
                style={styles.clearAll}
                accessibilityRole="button"
              >
                <ThemedText type="muted">Clear date filter</ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  triggerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trigger: {
    flex: 1,
    paddingVertical: PicoThemeVariables.formElementSpacingVertical,
    paddingHorizontal: PicoThemeVariables.formElementSpacingHorizontal,
    borderWidth: PicoThemeVariables.borderWidth,
    borderStyle: "solid",
    borderRadius: PicoThemeVariables.borderRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: {
    flex: 1,
    fontWeight: PicoThemeVariables.fontWeight,
  },
  triggerIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  clearButton: {
    paddingHorizontal: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "85%",
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PicoThemeVariables.formElementSpacingHorizontal,
    paddingVertical: PicoThemeVariables.formElementSpacingVertical,
    borderBottomWidth: PicoThemeVariables.borderWidth,
  },
  sheetBody: {
    padding: PicoThemeVariables.spacing,
    gap: PicoThemeVariables.spacing,
  },
  // Pinned summary of what Apply will do — the reader shouldn't have to
  // scroll to find out what they're about to commit.
  rangeSummary: {
    borderWidth: PicoThemeVariables.borderWidth,
    borderRadius: PicoThemeVariables.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  summaryLabel: {
    fontSize: 16,
  },
  applyLabel: {
    // Aligns "Apply" with the sheet title regardless of the Cancel text width.
    minWidth: 44,
    textAlign: "right",
  },
  presetRow: {
    gap: 8,
    paddingVertical: 4,
  },
  sectionLabel: {
    marginTop: PicoThemeVariables.spacing,
  },
  customRow: {
    gap: PicoThemeVariables.spacing,
  },
  customField: {
    gap: 4,
  },
  fieldLabel: {
    marginBottom: 2,
  },
  errorText: {
    color: PicoColors["red-800"],
  },
  hint: {
    textAlign: "center",
  },
  clearAll: {
    alignSelf: "center",
    paddingVertical: PicoThemeVariables.spacing,
  },
  disabled: {
    opacity: 0.4,
  },
});
