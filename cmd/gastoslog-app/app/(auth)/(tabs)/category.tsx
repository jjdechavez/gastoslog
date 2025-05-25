import { FlatList, StyleSheet, TouchableOpacity } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useCategories } from "@/hooks/categories/query";

export default function CategoryScreen() {
  const categoriesResult = useCategories();

  if (categoriesResult.status === "pending") {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={{ fontSize: 24 }}>Loading</ThemedText>
      </ThemedView>
    );
  }

  if (categoriesResult.status === "error") {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={{ fontSize: 24 }}>Error</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.floatingButton}>
        <ThemedText style={styles.floatingButtonText}>+</ThemedText>
      </TouchableOpacity>
      <FlatList
        data={categoriesResult.category}
        renderItem={({ item }) => (
          <ThemedText style={styles.item}>{item.name}</ThemedText>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    paddingTop: 40,
  },
  item: {
    padding: 10,
    fontSize: 18,
    height: 55,
  },
  floatingButton: {
    backgroundColor: "#007AFF",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 40,
    right: 30,
    elevation: 5, // For Android shadow
    shadowColor: "#000", // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingButtonText: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
