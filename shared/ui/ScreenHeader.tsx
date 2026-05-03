import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: string;
  left?: 'menu' | 'back' | 'none';
  onMenuPress?: () => void;
  onBackPress?: () => void;
  right?: ReactNode;
}

export function ScreenHeader({
  title,
  left = 'none',
  onMenuPress,
  onBackPress,
  right,
}: ScreenHeaderProps) {
  const handleBack = onBackPress ?? (() => router.back());

  return (
    <View style={styles.container} accessibilityRole="header">
      {left === 'menu' ? (
        <TouchableOpacity
          style={styles.sideSlot}
          onPress={onMenuPress}
          accessibilityRole="button"
          accessibilityLabel="Otevřít menu"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.icon}>☰</Text>
        </TouchableOpacity>
      ) : left === 'back' ? (
        <TouchableOpacity
          style={styles.sideSlot}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Zpět"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.icon}>←</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.sideSlot} />
      )}

      <Text style={styles.title} numberOfLines={1} accessibilityRole="text">
        {title}
      </Text>

      <View style={styles.sideSlot}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#7B1FA2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideSlot: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  title: {
    flex: 1,
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});
