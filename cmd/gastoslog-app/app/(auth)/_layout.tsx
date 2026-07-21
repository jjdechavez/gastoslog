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
      <Stack.Screen
        name="category/create"
        options={{ title: "Create category" }}
      />
      <Stack.Screen
        name="category/[categoryId]/edit"
        options={{ title: "Edit category" }}
      />
      <Stack.Screen
        name="expense/create"
        options={{ title: "Create expense" }}
      />
      <Stack.Screen
        name="expense/[expenseId]/edit"
        options={{ title: "Edit expense" }}
      />
      <Stack.Screen name="target/create" options={{ title: "Create target" }} />
      <Stack.Screen
        name="target/[targetId]"
        options={{
          title: "Target Details",
          headerTitleAlign: "center",
          headerTitleStyle: { fontSize: 16 },
        }}
      />
      <Stack.Screen
        name="target/[targetId]/log"
        options={{
          title: "Add Progress",
          headerTitleAlign: "center",
          headerTitleStyle: { fontSize: 16 },
        }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
