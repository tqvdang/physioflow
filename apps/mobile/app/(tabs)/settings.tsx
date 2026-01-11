import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface SettingsItemProps {
  icon: IoniconsName;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingsItem({ icon, label, value, onPress, danger }: SettingsItemProps) {
  return (
    <Pressable
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View
        style={[
          styles.iconContainer,
          danger && { backgroundColor: Colors.light.error + '20' },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? Colors.light.error : Colors.light.tint}
        />
      </View>
      <View style={styles.settingsContent}>
        <Text style={[styles.settingsLabel, danger && { color: Colors.light.error }]}>
          {label}
        </Text>
        {value && <Text style={styles.settingsValue}>{value}</Text>}
      </View>
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors.light.textSecondary}
        />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all locally cached data. Your synced data is safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement cache clearing
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile section */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0] || 'U'}
            {user?.lastName?.[0] || ''}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || 'Therapist'}</Text>
        </View>
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionContent}>
          <SettingsItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => {}}
          />
          <SettingsItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => {}}
          />
          <SettingsItem
            icon="lock-closed-outline"
            label="Security"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* App section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.sectionContent}>
          <SettingsItem
            icon="cloud-outline"
            label="Sync Settings"
            value="Auto-sync enabled"
            onPress={() => {}}
          />
          <SettingsItem
            icon="moon-outline"
            label="Appearance"
            value="System"
            onPress={() => {}}
          />
          <SettingsItem
            icon="trash-outline"
            label="Clear Cache"
            onPress={handleClearCache}
          />
        </View>
      </View>

      {/* Support section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.sectionContent}>
          <SettingsItem
            icon="help-circle-outline"
            label="Help Center"
            onPress={() => {}}
          />
          <SettingsItem
            icon="chatbubble-outline"
            label="Contact Support"
            onPress={() => {}}
          />
          <SettingsItem
            icon="document-text-outline"
            label="Privacy Policy"
            onPress={() => {}}
          />
          <SettingsItem
            icon="information-circle-outline"
            label="About"
            value="Version 1.0.0"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.section}>
        <View style={styles.sectionContent}>
          <SettingsItem
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>PhysioFlow Mobile v1.0.0</Text>
        <Text style={styles.footerText}>Built with Expo SDK 50</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.light.background,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  roleBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.light.tint + '20',
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.tint,
    textTransform: 'capitalize',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.light.tint + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsContent: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 16,
    color: Colors.light.text,
  },
  settingsValue: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
});
