import { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, LayoutChangeEvent } from 'react-native';

interface Props {
  mode: 'near' | 'route';
  onChange: (mode: 'near' | 'route') => void;
}

export default function SegmentedSearchMode({ mode, onChange }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const anim = useRef(new Animated.Value(mode === 'near' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: mode === 'near' ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [mode]);

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  // Pill has 4px inset from each of its two halves: left=4 (near) or trackWidth/2+4 (route)
  const pillLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, trackWidth > 0 ? trackWidth / 2 + 4 : 4],
  });
  const pillWidth = trackWidth > 0 ? trackWidth / 2 - 8 : 0;

  return (
    <View style={styles.track} onLayout={onLayout}>
      {trackWidth > 0 && (
        <Animated.View style={[styles.pill, { left: pillLeft, width: pillWidth }]} />
      )}
      <TouchableOpacity style={styles.segment} onPress={() => onChange('near')} activeOpacity={0.9}>
        <Text style={[styles.label, mode === 'near' && styles.labelActive]}>🧭 V okolí</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.segment} onPress={() => onChange('route')} activeOpacity={0.9}>
        <Text style={[styles.label, mode === 'route' && styles.labelActive]}>🚗 Po cestě</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 52,
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 26,
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: '#4caf50',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  segment: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  labelActive: {
    color: '#ffffff',
  },
});
