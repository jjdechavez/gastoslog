import { HGroup } from "@/components/HGroup";
import { ThemedView } from "@/components/ThemedView";
import { useSession } from "@/context/session";
import { PicoLimeStyles } from "@/styles/pico-lime";
import { Button, ButtonText } from "@/components/Button";

export default function ProfileScreen() {
  const { signOut } = useSession();

  return (
    <ThemedView style={PicoLimeStyles.container}>
      <HGroup title="Profile" style={{ marginTop: 24 }} />

      <Button onPress={signOut}>
        <ButtonText>Sign Out</ButtonText>
      </Button>
    </ThemedView>
  );
}
