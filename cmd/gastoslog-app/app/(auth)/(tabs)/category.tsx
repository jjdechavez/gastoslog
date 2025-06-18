import { FlatList, StyleSheet, TouchableOpacity } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SearchBar } from "@/components/ui/SearchBar";
import { Separator } from "@/components/Separator";
import {
  PicoThemeVariables,
  PicoLimeStyles as pstyles,
} from "@/styles/pico-lime";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Alert } from "@/components/Alert";
import {
  FloatingButton,
  styles as floatingButtonStyle,
} from "@/components/FloatingButton";
import { useCategories } from "@/services/api-hook/category";

export default function CategoryScreen() {
  const categoriesResult = useCategories();
  const params = useLocalSearchParams();

  if (categoriesResult.status === "pending") {
    return (
      <ThemedView style={pstyles.container}>
        <ThemedText style={{ fontSize: 24 }}>Loading</ThemedText>
      </ThemedView>
    );
  }

  if (categoriesResult.status === "error") {
    return (
      <ThemedView style={pstyles.container}>
        <ThemedText style={{ fontSize: 24 }}>Error</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={pstyles.container}>
      {params.success ? (
        <Alert type="success" message={params.success as string} />
      ) : null}
      <SearchBar />

      <Separator />

      <FloatingButton>
        <Link href="/(auth)/category/create" asChild push>
          <TouchableOpacity style={floatingButtonStyle.button}>
            <IconSymbol
              name="plus"
              color={PicoThemeVariables.primaryColor}
              size={30}
            />
          </TouchableOpacity>
        </Link>
      </FloatingButton>

      <FlatList
        data={categoriesResult.data.data}
        renderItem={({ item }) => (
          <Link href={`/(auth)/category/${item.id}/edit`} asChild push>
            <ThemedText style={styles.item}>{item.name}</ThemedText>
          </Link>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  item: {
    padding: 10,
    fontSize: 18,
    height: 55,
  },
});
