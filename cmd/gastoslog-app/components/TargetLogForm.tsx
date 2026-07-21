import { Screen } from "@/components/Screen";
import { TargetLogInput } from "@/types/target";
import { Controller, UseFormReturn } from "react-hook-form";
import { Button, ButtonText } from "./Button";
import { InputError } from "./Input";
import { Fieldset, Label } from "./Fieldset";
import { DatePicker } from "./DatePicker";
import { HGroup } from "./HGroup";
import { FormField } from "./FormField";
import { Alert } from "./Alert";

type TargetLogFormBaseProps = {
  form: UseFormReturn<TargetLogInput>;
  onSubmit: (input: TargetLogInput) => void;
  submitError?: string | null;
  isSubmitting?: boolean;
};

type CreateTargetLogFormProps = TargetLogFormBaseProps & {
  action: "create";
};

type EditTargetLogFormProps = TargetLogFormBaseProps & {
  action: "edit";
};

type TargetLogFormProps = CreateTargetLogFormProps | EditTargetLogFormProps;

export function TargetLogForm(props: TargetLogFormProps) {
  const title = props.action === "edit" ? "Edit Progress" : "New Progress";
  const { form, onSubmit, submitError, isSubmitting } = props;
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const onFormSubmit = handleSubmit((payload) => {
    onSubmit(payload);
  });

  return (
    <Screen scroll keyboardAvoiding>
      <HGroup title={title} />

      {submitError ? <Alert type="error" message={submitError} /> : null}

      <FormField
        control={control}
        name="amount"
        label="Amount"
        required
        variant="amount"
        placeholder="Amount"
      />

      <FormField
        control={control}
        name="notes"
        label="Notes (Optional)"
        placeholder="e.g., Monthly savings"
        multiline
      />

      <Controller
        name="entryDate"
        control={control}
        render={({ field: { onChange, value } }) => (
          <Fieldset>
            <Label name="Entry Date" required />
            <DatePicker
              value={value}
              onChange={(date) => onChange(date.toISOString())}
              placeholder="Select date"
              maximumDate={new Date()}
            />
          </Fieldset>
        )}
      />
      <InputError name="entryDate" errors={errors as Record<string, unknown>} />

      <Button onPressIn={onFormSubmit} disabled={isSubmitting}>
        <ButtonText>
          {isSubmitting
            ? "Saving..."
            : `${props.action === "create" ? "Add" : "Update"} Progress`}
        </ButtonText>
      </Button>
    </Screen>
  );
}
