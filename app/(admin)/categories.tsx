import React, { useEffect } from 'react';
import { router } from 'expo-router';

export default function RedirectToCategories() {
  useEffect(() => {
    // Note: We need products.tsx to handle a 'view' param to show categories by default
    router.replace('/(admin)/products?view=categories');
  }, []);
  return null;
}
