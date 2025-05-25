import { ThemedText } from "@/components/ThemedText";
import { useSession } from "@/context/session";
import { View, Text, TouchableOpacity } from "react-native";

export default function ProfileScreen() {
  const { signOut } = useSession();
  return (
    <View>
      <Text>Profile screen</Text>
      <TouchableOpacity onPress={signOut}>
        <ThemedText>Sign Out</ThemedText>
      </TouchableOpacity>
    </View>
  );
}
