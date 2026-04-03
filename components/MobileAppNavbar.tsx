import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

/** Green top bar with logo — use on native-only screens (not web). */
export default function MobileAppNavbar() {
  return (
    <View style={styles.navbar} accessibilityRole="header">
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Book my ground"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    minHeight: 92,
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 14,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#043529',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  logo: {
    marginTop: 8,
    marginBottom: 2,
    height: 40,
    width: 200,
    maxWidth: '100%',
  },
});
