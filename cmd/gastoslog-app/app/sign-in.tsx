import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Link, router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSession } from "@/context/session";
import { HGroup } from "@/components/HGroup";
import { Input } from "@/components/Input";
import { Button, ButtonText } from "@/components/Button";
import { PicoThemeVariables } from "@/styles/pico-lime";

export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignin = async () => {
    const result = await signIn(email, password);

    if (result) {
      router.replace("/(auth)/(tabs)");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <HGroup
        title="Gastoslog"
        subtitle="Sign In with your account"
        style={styles.hgroup}
      />

      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button onPress={handleSignin}>
        <ButtonText>Sign In</ButtonText>
      </Button>

      <View style={styles.footer}>
        <ThemedText>Don't have an account? </ThemedText>
        <Link href="/sign-up" asChild>
          <TouchableOpacity>
            <ThemedText style={styles.link}>Sign Up</ThemedText>
          </TouchableOpacity>
        </Link>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  hgroup: {
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  link: {
    color: PicoThemeVariables.primaryColor,
    fontWeight: "bold",
  },
});
