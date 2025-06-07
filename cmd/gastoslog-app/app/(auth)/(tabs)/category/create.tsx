import { Button, ButtonText } from "@/components/Button";
import { HGroup } from "@/components/HGroup";
import { Input } from "@/components/Input";
import { ThemedView } from "@/components/ThemedView";
import { PicoLimeStyles } from "@/styles/pico-lime";

export default function CreateCategoryScreen() {
  return (
    <ThemedView style={PicoLimeStyles.container}>
      <HGroup title="New Category" />

      <Input label="Name" placeholder="Name" autoCapitalize="none" required />
      <Input
        label="Description"
        placeholder="Description"
        autoCapitalize="none"
      />

      <Button>
        <ButtonText>Create category</ButtonText>
      </Button>
    </ThemedView>
  );
}
