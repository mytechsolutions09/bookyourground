import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

type MobileAppNavbarProps = {
  /** When set, shows this label instead of the logo (e.g. tab title). */
  title?: string;
  titleColor?: string;
  rightAction?: React.ReactNode;
  lightBg?: boolean;
  smallerTitle?: boolean;
  bgColor?: string;
  leftAction?: React.ReactNode;
};

/** Green top bar with logo — use on native-only screens (not web). */
export default function MobileAppNavbar({ 
  title, 
  titleColor = '#01b854', 
  rightAction, 
  lightBg, 
  smallerTitle,
  bgColor,
  leftAction
}: MobileAppNavbarProps) {
  const navigation = useNavigation();
  const [canGoBack, setCanGoBack] = React.useState(false);

  React.useEffect(() => {
    // Check if we can go back within the current navigator
    setCanGoBack(navigation.canGoBack());
  }, [navigation]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      // Fallback: If we can't go back but button was shown, just skip or go to home
      console.warn('Cannot go back from this screen');
    }
  };

  return (
    <View style={[styles.navbar, lightBg && styles.navbarLight, bgColor ? { backgroundColor: bgColor } : null]} accessibilityRole="header">
      {leftAction && (
        <View style={styles.leftActionContainer}>
          {leftAction}
        </View>
      )}
      {title ? (
        <Text style={[styles.titleText, { color: titleColor }, smallerTitle && { fontSize: 15 }]}>{title}</Text>
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
    minHeight: Platform.OS === 'web' ? 70 : 90,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 10 : 32,
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
    bottom: 8,
    padding: 4,
  },
  logo: {
    marginTop: 8,
    marginBottom: 2,
    height: 50,
    width: 250,
    maxWidth: '100%',
  },
  titleText: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  leftActionContainer: {
    position: 'absolute',
    left: 16,
    bottom: 8,
    zIndex: 10,
  },
  rightActionContainer: {
    position: 'absolute',
    right: 16,
    bottom: 8,
  },
  navbarLight: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#F1F5F9',
  },
});
