import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';

interface PasswordRequirementProps {
  label: string;
  met: boolean;
  theme?: 'light' | 'dark';
}

export default function PasswordRequirement({ label, met, theme = 'dark' }: PasswordRequirementProps) {
  // Colors based on theme
  const unmetBg = theme === 'light' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.15)';
  const unmetText = theme === 'light' ? '#b91c1c' : '#fca5a5';
  
  // If met, we usually hide it in the current flow, but if we don't:
  const metBg = theme === 'light' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.15)';
  const metText = theme === 'light' ? '#065f46' : '#6ee7b7';
  
  return (
    <View style={styles.container}>
      <Text style={[
        styles.text, 
        { color: met ? metText : unmetText }
      ]}>
        {met ? '✓ ' : '○ '}{label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    marginRight: 12,
    marginTop: 6,
  },
  text: { 
    fontSize: 11, 
    fontFamily: 'Inter',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
