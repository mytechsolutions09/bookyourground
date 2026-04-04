import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

type MobileAppNavbarProps = {
  /** When set, shows this label instead of the logo (e.g. tab title). */
  title?: string;
  titleColor?: string;
  rightAction?: React.ReactNode;
};

/** Green top bar with logo — use on native-only screens (not web). */
export default function MobileAppNavbar({ title, titleColor = '#02c259', rightAction }: MobileAppNavbarProps) {
  return (
    <View style={styles.navbar} accessibilityRole="header">
      {title ? (
        <Text style={[styles.titleText, { color: titleColor }]}>{title}</Text>
      ) : (
        <Image
          source={require('../assets/BOOK_MY_GROUND__6_-removebg-preview.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Book my ground"
        />
      )}
      {rightAction && <View style={styles.rightActionContainer}>{rightAction}</View>}
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
  titleText: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rightActionContainer: {
    position: 'absolute',
    right: 16,
    bottom: 12,
  },
});
