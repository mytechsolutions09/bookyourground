import React, { useEffect } from 'react';
import { router } from 'expo-router';

export default function RedirectToWishlists() {
  useEffect(() => {
    router.replace('/(admin)/products?view=wishlists');
  }, []);
  return null;
}
