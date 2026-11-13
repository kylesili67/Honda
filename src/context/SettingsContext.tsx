import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SAMPLE_SETTINGS } from '../data/sample';
import { getPublicSettings } from '../services/settings';
import type { SiteSettingsMap } from '../types/database';

interface SettingsContextValue {
  settings: SiteSettingsMap;
  isLoading: boolean;
  refetch: () => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: SAMPLE_SETTINGS,
  isLoading: false,
  refetch: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['public-settings'],
    queryFn: getPublicSettings,
    staleTime: 60_000,
  });

  return (
    <SettingsContext.Provider
      value={{
        settings: data ?? SAMPLE_SETTINGS,
        isLoading,
        refetch: () => {
          void refetch();
        },
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
