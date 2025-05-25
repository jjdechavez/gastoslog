import { Redirect, Stack } from "expo-router";
import { Text } from "react-native";
import { useSession } from "@/context/session";

export default function AuthLayout() {
  const { isLoading, session } = useSession();

  if (isLoading) {
    return <Text>Loading</Text>;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
