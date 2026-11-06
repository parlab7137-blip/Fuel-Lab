import { useCallback, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Settings } from '@fuellab/shared';
import { api } from '../api';
import { useAuth } from '../auth';
import { colors, styles } from '../theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.getSettings().then(({ settings: s }) => setSettings(s)).catch((e: Error) => setError(e.message));
    }, []),
  );

  if (!settings) {
    return (
      <View style={[styles.screen, { padding: 20 }]}>
        <Text style={styles.muted}>{error ?? 'Loading…'}</Text>
      </View>
    );
  }

  const set = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch });
  const setTarget = (key: keyof Settings['targets'], value: string) =>
    setSettings({ ...settings, targets: { ...settings.targets, [key]: Number(value) || 0 } });

  const save = async () => {
    try {
      const { settings: s } = await api.saveSettings(settings);
      setSettings(s);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Household settings</Text>
      <Text style={styles.muted}>
        Signed in as {user?.name} ({user?.email}). Household size drives the planner's default servings; targets drive the
        Today counter.
      </Text>
      <Text style={styles.label}>Household size</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={String(settings.householdSize)}
        onChangeText={(v) => set({ householdSize: Number(v) || 0 })}
      />
      <Text style={styles.h2}>Daily targets</Text>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.label}>Calories</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={String(settings.targets.calories)} onChangeText={(v) => setTarget('calories', v)} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={String(settings.targets.protein)} onChangeText={(v) => setTarget('protein', v)} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.label}>Carbs (g)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={String(settings.targets.carbs)} onChangeText={(v) => setTarget('carbs', v)} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.label}>Fat (g)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={String(settings.targets.fat)} onChangeText={(v) => setTarget('fat', v)} />
        </View>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>{saved ? 'Saved ✓' : 'Save settings'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.buttonGhost, { borderColor: colors.danger }]} onPress={logout}>
        <Text style={{ color: colors.danger, fontWeight: '600' }}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
