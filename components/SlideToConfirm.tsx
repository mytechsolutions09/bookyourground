import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated,
  PanResponder, Platform, useWindowDimensions, Pressable
} from 'react-native';

interface SlideToConfirmProps {
  onConfirm: () => void;
  label?: string;
  confirmLabel?: string;
  color?: string;
  disabled?: boolean;
}

export default function SlideToConfirm({
  onConfirm,
  label = 'Slide to Confirm Booking',
  confirmLabel = 'Confirmed!',
  color = '#01b854',
  disabled = false,
}: SlideToConfirmProps) {
  const { width } = useWindowDimensions();
  const isWebBigScreen = Platform.OS === 'web' && width > 768;

  const [confirmed, setConfirmed] = useState(false);
  const fillAnim = useRef(new Animated.Value(0)).current;
  const trackWidth = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !confirmed,
      onMoveShouldSetPanResponder: () => !disabled && !confirmed,
      onPanResponderMove: (_, gesture) => {
        const pct = Math.min(Math.max(gesture.moveX / trackWidth.current, 0), 1);
        fillAnim.setValue(pct);
      },
      onPanResponderRelease: (_, gesture) => {
        const pct = gesture.moveX / trackWidth.current;
        if (pct >= 0.85) {
          Animated.timing(fillAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            setConfirmed(true);
            onConfirm();
          });
        } else {
          Animated.spring(fillAnim, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  if (isWebBigScreen) {
    return (
      <Pressable
        onPress={onConfirm}
        disabled={disabled}
        style={({ pressed }) => [
          styles.track,
          { backgroundColor: color, borderColor: color },
          disabled && styles.disabled,
          pressed && { opacity: 0.85 }
        ]}
      >
        <Text style={[styles.label, styles.confirmedLabel]}>
          {label.replace(/Slide to /i, '')}
        </Text>
      </Pressable>
    );
  }

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const textOpacity = fillAnim.interpolate({
    inputRange: [0, 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const confirmOpacity = fillAnim.interpolate({
    inputRange: [0.85, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[styles.track, disabled && styles.disabled]}
      onLayout={e => { trackWidth.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
    >
      {/* Fill bar */}
      <Animated.View
        style={[styles.fill, { width: fillWidth, backgroundColor: color }]}
      />

      {/* Slide label */}
      <Animated.Text style={[styles.label, { opacity: textOpacity }]}>
        {label}
      </Animated.Text>

      {/* Confirmed label */}
      <Animated.Text style={[styles.label, styles.confirmedLabel, { opacity: confirmOpacity }]}>
        {confirmLabel}
      </Animated.Text>

      {/* Arrow indicator */}
      {!confirmed && (
        <View style={[styles.arrow, { backgroundColor: color }]}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  disabled: {
    opacity: 0.5,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 28,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    zIndex: 2,
    letterSpacing: 0.3,
    position: 'absolute',
    left: 56,
    right: 16,
    textAlign: 'center',
  },
  confirmedLabel: {
    color: '#FFFFFF',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  arrow: {
    position: 'absolute',
    left: 6,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  arrowText: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 30,
  },
});
