import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';

interface PasswordRequirementProps {
  label: string;
  met: boolean;
  theme?: 'light' | 'dark';
}

export default function PasswordRequirement({ label, met, theme = 'dark' }: PasswordRequirementProps) {
  const isWeb = Platform.OS === 'web';
  
  // Colors based on theme
  const unmetColor = theme === 'light' ? '#1e293b' : '#94a3b8';
  const metColor = theme === 'light' ? '#064e3b' : '#01b854';
  
  return (
    <View style={styles.container}>
      <View style={[
        styles.dot, 
        { backgroundColor: met ? metColor : unmetColor }
      ]} />
      <Text style={[
        styles.text, 
        { 
          color: met ? metColor : unmetColor,
          fontWeight: met ? '700' : '500',
        }
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginRight: 12,
    marginTop: 4 
  },
  dot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3 
  },
  text: { 
    fontSize: 11, 
    fontFamily: 'Inter',
    fontWeight: '500',
  },
});
