import React, { createContext, useContext, useState } from 'react';

interface UIContextType {
  isTabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
  tabAnimation: 'slide_from_left' | 'slide_from_right' | 'slide_from_bottom' | 'none';
  setTabAnimation: (anim: 'slide_from_left' | 'slide_from_right' | 'slide_from_bottom' | 'none') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isTabBarVisible, setTabBarVisible] = useState(true);
  const [tabAnimation, setTabAnimation] = useState<'slide_from_left' | 'slide_from_right' | 'slide_from_bottom' | 'none'>('slide_from_right');

  const value = React.useMemo(() => ({ 
    isTabBarVisible, 
    setTabBarVisible,
    tabAnimation,
    setTabAnimation
  }), [isTabBarVisible, tabAnimation]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
