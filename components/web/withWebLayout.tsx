import React from 'react';
import { Platform } from 'react-native';
import WebLayout from './WebLayout';

export function withWebLayout<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => {
    if (Platform.OS === 'web') {
      return (
        <WebLayout>
          <Component {...props} />
        </WebLayout>
      );
    }
    return <Component {...props} />;
  };
}
