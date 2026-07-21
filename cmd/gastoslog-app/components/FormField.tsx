import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Fieldset, Label } from "./Fieldset";
import { Input, InputError, type InputProps } from "./Input";

export type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<InputProps, "value" | "onChangeText" | "onBlur" | "hasError"> & {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  required?: boolean;
  variant?: "text" | "amount";
};

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  required,
  variant = "text",
  ...inputProps
}: FormFieldProps<TFieldValues, TName>) {
  const { field, fieldState, formState } = useController({ control, name });

  const value =
    variant === "amount"
      ? field.value
        ? field.value.toString()
        : ""
      : field.value;

  return (
    <>
      <Fieldset>
        {label ? <Label name={label} required={required} /> : null}
        <Input
          {...inputProps}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          value={value}
          hasError={!!fieldState.error}
          isLoading={formState.isSubmitting}
          inputMode={variant === "amount" ? "decimal" : inputProps.inputMode}
        />
      </Fieldset>
      <InputError name={name} errors={formState.errors as Record<string, unknown>} />
    </>
  );
}
