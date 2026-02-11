import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add custom fonts here if needed
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.light.background,
          },
          headerTintColor: Colors.light.tint,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: Colors.light.backgroundSecondary,
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="patient/[id]"
          options={{
            title: 'Patient Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="patient/session/[sessionId]"
          options={{
            title: 'Session',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="patient/[id]/insurance"
          options={{
            title: 'Insurance',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="patient/[id]/insurance-form"
          options={{
            title: 'Insurance Card',
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="patient/outcome-measures/[patientId]"
          options={{
            title: 'Outcome Measures',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="patient/outcome-measures/record/[patientId]"
          options={{
            title: 'Record Measure',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="patient/outcome-measures/edit/[measureId]"
          options={{
            title: 'Edit Measure',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="billing/invoices"
          options={{
            title: 'Hoa don',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="billing/[invoiceId]"
          options={{
            title: 'Chi tiet hoa don',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="patient/protocol/[protocolId]"
          options={{
            title: 'Protocol',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="protocols/index"
          options={{
            title: 'Protocol Library',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="patient/discharge/[patientId]"
          options={{
            title: 'Discharge Planning',
            presentation: 'card',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
