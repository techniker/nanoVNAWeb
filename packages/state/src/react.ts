import React, { createContext, useContext } from 'react';
import type { AppState } from './app-state.js';

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider(props: {
  value: AppState;
  children: React.ReactNode;
}): React.ReactElement {
  return React.createElement(AppStateContext.Provider, { value: props.value }, props.children);
}

export function useStores(): AppState['stores'] {
  const ctx = useContext(AppStateContext);
  if (ctx === null) {
    throw new Error('useStores must be called inside <AppStateProvider>');
  }
  return ctx.stores;
}
