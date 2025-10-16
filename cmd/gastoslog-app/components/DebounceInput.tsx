import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { Input } from "./Input";

export type DebounceInputProps = React.ComponentProps<typeof Input> & {
  debounce?: number;
};

export function DebounceInput({
  value: initialValue = "",
  debounce = 1000,
  onChangeText,
  ...props
}: DebounceInputProps) {
  const [value, setValue] = useState<string>(initialValue);
  const debounced = useDebouncedCallback(
    (value) => onChangeText!(value),
    debounce,
  );

  return (
    <Input
      onChangeText={(e) => {
        if (e === "") {
          setValue("");
          return debounced("");
        }
        setValue(e);
        debounced(e);
      }}
      value={value}
      {...props}
    />
  );
}
