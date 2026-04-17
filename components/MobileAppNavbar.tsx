import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

type MobileAppNavbarProps = {
  /** When set, shows this label instead of the logo (e.g. tab title). */
  title?: string;
  titleColor?: string;
  rightAction?: React.ReactNode;
  lightBg?: boolean;
};

/** Green top bar with logo — use on native-only screens (not web). */
export default function MobileAppNavbar({ title, titleColor = '#01b854', rightAction, lightBg }: MobileAppNavbarProps) {
  const canGoBack = router.canGoBack();

  return (
    <View style={[styles.navbar, lightBg && styles.navbarLight]} accessibilityRole="header">
      {canGoBack && (
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={24} color={titleColor} />
        </TouchableOpacity>
      )}
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
    minHeight: Platform.OS === 'web' ? 64 : 92,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 32,
    paddingBottom: 8,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    padding: 4,
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
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  rightActionContainer: {
    position: 'absolute',
    right: 16,
    bottom: 12,
  },
  navbarLight: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#F1F5F9',
  },
});
