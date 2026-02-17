'use client';

import { useContext } from 'react';
import { LocaleContext } from '@/components/providers/LocaleProvider';

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
