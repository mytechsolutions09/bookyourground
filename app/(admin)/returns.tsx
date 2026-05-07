import React, { useEffect } from 'react';
import { router } from 'expo-router';

export default function RedirectToReturns() {
  useEffect(() => {
    router.replace('/(admin)/orders?filter=returns');
  }, []);
  return null;
}
