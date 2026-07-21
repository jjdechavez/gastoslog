import { Tabs } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: "absolute",
            },
            default: {},
          }),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Overview",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="house.fill" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="expense"
          options={{
            title: "Expenses",
            tabBarIcon: ({ color }) => (
              <IconSymbol
                size={28}
                name="list.bullet.rectangle.portrait"
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="target"
          options={{
            title: "Targets",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="flag" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="person" color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
