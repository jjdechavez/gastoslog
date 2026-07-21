import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Link, router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useSession } from "@/context/session";
import { HGroup } from "@/components/HGroup";
import { Input } from "@/components/Input";
import { Button, ButtonText } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { PicoThemeVariables } from "@/styles/pico-lime";
import { Fieldset } from "@/components/Fieldset";
import { Alert } from "@/components/Alert";

export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignin = async () => {
    setError(null);
    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.success) {
      router.replace("/(auth)/(tabs)");
    } else {
      setError(result.error ?? "Unable to sign in. Please try again.");
    }
  };

  return (
    <Screen keyboardAvoiding contentContainerStyle={styles.container}>
      <HGroup
        title="Gastoslog"
        subtitle="Sign In with your account"
        style={styles.hgroup}
      />

      {error ? <Alert type="error" message={error} /> : null}

      <Fieldset>
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Fieldset>

      <Fieldset>
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </Fieldset>

      <Button onPress={handleSignin} disabled={isSubmitting}>
        <ButtonText>{isSubmitting ? "Signing In..." : "Sign In"}</ButtonText>
      </Button>

      <View style={styles.footer}>
        <ThemedText>Don't have an account? </ThemedText>
        <Link href="/sign-up" asChild>
          <TouchableOpacity>
            <ThemedText style={styles.link}>Sign Up</ThemedText>
          </TouchableOpacity>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
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
