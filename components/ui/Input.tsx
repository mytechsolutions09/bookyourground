import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle, Platform } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export default function Input({
  label,
  error,
  containerStyle,
  style,
  ...props
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '300',
    color: Platform.OS === 'web' ? '#374151' : '#E5E7EB',
    marginBottom: 8,
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
  },
  input: {
    borderWidth: 1,
    borderColor: Platform.OS === 'web' ? '#D1D5DB' : '#00ea6b',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontWeight: '300',
    backgroundColor: Platform.OS === 'web' ? '#FFFFFF' : '#06392e',
    color: Platform.OS === 'web' ? '#111827' : '#00ea6b',
    fontFamily: Platform.OS === 'web' ? '"Inter", sans-serif' : undefined,
    ...Platform.select({
        web: {
            outlineStyle: 'none',
        } as any
    })
  },
  inputError: {
    borderColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
  },
});
