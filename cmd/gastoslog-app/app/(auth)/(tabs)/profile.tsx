import { Link } from "expo-router";
import { TouchableOpacity } from "react-native";

import { Card } from "@/components/Card";
import { HGroup } from "@/components/HGroup";
import { ListRow } from "@/components/ListRow";
import { Separator } from "@/components/Separator";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useSession } from "@/context/session";
import { useThemeColor } from "@/hooks/useThemeColor";
import { PicoLimeStyles } from "@/styles/pico-lime";
import { Button, ButtonText } from "@/components/Button";

export default function ProfileScreen() {
  const { signOut } = useSession();
  const iconColor = useThemeColor({}, "textMuted");

  return (
    <ThemedView style={PicoLimeStyles.container}>
      <HGroup title="Profile" style={{ marginTop: 24 }} />

      <Card>
        <Link href="/(auth)/category" asChild push>
          <TouchableOpacity>
            <ListRow
              title="Categories"
              subtitle="Manage your expense categories"
              right={
                <IconSymbol
                  name="chevron.right"
                  size={20}
                  color={iconColor}
                />
              }
            />
          </TouchableOpacity>
        </Link>
      </Card>

      <Separator />

      <Button onPress={signOut}>
        <ButtonText>Sign Out</ButtonText>
      </Button>
    </ThemedView>
  );
}
