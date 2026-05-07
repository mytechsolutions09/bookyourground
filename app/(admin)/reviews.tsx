import React, { useEffect } from 'react';
import { router } from 'expo-router';

export default function RedirectToReviews() {
  useEffect(() => {
    router.replace('/(admin)/products?view=reviews');
  }, []);
  return null;
}
