import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useCategories } from "@/hooks/categories/query";
import { SearchBar } from "@/components/ui/SearchBar";
import { Separator } from "@/components/Separator";
import {
  PicoThemeVariables,
  PicoLimeStyles as pstyles,
} from "@/styles/pico-lime";
import { IconSymbol } from "@/components/ui/IconSymbol";

export default function CategoryScreen() {
  const categoriesResult = useCategories();

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
      <SearchBar />

      <Separator />

      <View style={styles.floatingButtonContainer}>
        <Link href="/(auth)/(tabs)/category/create" asChild push>
          <TouchableOpacity style={styles.floatingButton}>
            <IconSymbol
              name="plus"
              color={PicoThemeVariables.primaryColor}
              size={30}
            />
          </TouchableOpacity>
        </Link>
      </View>

      <FlatList
        data={categoriesResult.category}
        renderItem={({ item }) => (
          <Link href={`/(auth)/(tabs)/category/${item.id}/edit`} asChild push>
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
  floatingButtonContainer: {
    position: "absolute",
    bottom: 35,
    right: 25,
  },
  floatingButton: {
    backgroundColor: PicoThemeVariables.primaryBackground,
    elevation: 5, // For Android shadow
    shadowColor: "#000", // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,

    zIndex: 1,
    height: 56,
    width: 56,
    borderRadius: 100,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
});
