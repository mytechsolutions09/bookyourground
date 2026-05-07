import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';
import { 
  ShoppingBag, 
  RotateCcw, 
  Package, 
  Layers, 
  Plus
} from 'lucide-react-native';

const BASE = '/(admin)';

export default function ShopSubbar({ children, onAddProduct }: { children: React.ReactNode, onAddProduct?: () => void }) {
  const pathname = usePathname();

  const isOrders = pathname.includes('/orders');
  const isReturns = pathname.includes('/returns');
  const isProducts = pathname.includes('/products');
  const isCategories = pathname.includes('/categories');

  return (
    <View style={styles.shell}>
      <View style={styles.headerBar}>
        <View style={styles.leftSection}>
          <View style={styles.iconBox}>
            <ShoppingBag size={18} color="#10b981" />
          </View>
          <View style={styles.titleGroup}>
            <Text style={styles.titleText}>Shop</Text>
            <Text style={styles.subtitleText}>Management</Text>
          </View>
        </View>

        <View style={styles.navSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navScrollContent}
          >
            <NavButton 
              onPress={() => router.push((BASE + '/orders') as any)}
              isActive={isOrders}
              label="SHOP ORDERS"
            />
            <NavButton 
              onPress={() => router.push((BASE + '/returns') as any)}
              isActive={isReturns}
              label="RETURNS"
            />
            <NavButton 
              onPress={() => router.push((BASE + '/products') as any)}
              isActive={isProducts}
              label="PRODUCTS"
            />
            <NavButton 
              onPress={() => router.push((BASE + '/categories') as any)}
              isActive={isCategories}
              label="CATEGORIES"
            />
          </ScrollView>
        </View>

        <TouchableOpacity 
          style={styles.addButton}
          onPress={onAddProduct}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>ADD PRODUCT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

function NavButton({ onPress, isActive, label }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.navBtn, isActive && styles.navBtnActive]}
    >
      <Text style={[styles.navBtnLabel, isActive && styles.navBtnLabelActive]}>
        {label}
      </Text>
      {isActive && <View style={styles.activeIndicator} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 24,
    height: 56,
    ...Platform.select({
      web: { position: 'sticky' as any, top: 0, zIndex: 100 },
    }),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 24,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter',
  },
  subtitleText: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: -1,
    fontFamily: 'Inter',
  },
  navSection: {
    flex: 1,
    height: '100%',
  },
  navScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  navBtn: {
    height: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navBtnActive: {
    backgroundColor: '#F9FAFB',
  },
  navBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
  navBtnLabelActive: {
    color: '#10b981', 
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ea6b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#05291f',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Inter',
  },
  content: {
    flex: 1,
  },
});
